import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@kidai/db'
import { getChildSession } from '@/lib/session'
import { checkAccessAllowed, incrementUsage } from '@/lib/usage'
import { createAlert } from '@/lib/alerts'
import { runInputPipeline, runOutputPipeline } from '@kidai/moderation'
import { buildBlockedMessage, buildSystemPrompt, getAiClient, getChatClient, AGE_TIER_CONFIGS } from '@kidai/ai'
import type { TopicCategory } from '@kidai/shared'

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // Guard: fail fast with a clear message if no AI provider is configured
  // Treat empty string the same as unset
  const hasGroq = !!process.env.GROQ_API_KEY?.trim()
  const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim()
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim()
  if (!hasGroq && !hasOpenAI && !hasGemini) {
    return NextResponse.json(
      { error: "I'm not quite ready yet! Ask a parent to finish setting me up." },
      { status: 503 }
    )
  }

  // 1. Verify child session
  const session = await getChildSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { childId, parentId, tier, displayName } = session

  // 2. Check access (paused, time limit, blackout)
  const access = await checkAccessAllowed(childId)
  if (!access.allowed) {
    if (access.reason === 'daily_limit' || access.reason === 'blackout') {
      await createAlert({
        parentId,
        childId,
        alertType: access.reason === 'daily_limit' ? 'TIME_LIMIT_REACHED' : 'BLACKOUT_ATTEMPTED',
        description:
          access.reason === 'daily_limit'
            ? `${displayName} reached their daily time limit`
            : `${displayName} tried to access during blackout hours`,
      })
    }

    return NextResponse.json(
      {
        error:
          access.reason === 'paused'
            ? 'Access is paused by your parent'
            : access.reason === 'daily_limit'
              ? "You've reached your time limit for today!"
              : "It's not chat time right now. Check back later!",
        reason: access.reason,
      },
      { status: 403 }
    )
  }

  // 3. Parse request
  let body: z.infer<typeof chatSchema>
  try {
    body = chatSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, conversationId } = body

  // 4. Load child's topic restrictions
  const child = await prisma.childProfile.findUnique({
    where: { id: childId },
    include: {
      topicRestrictions: true,
      customTopics: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  if (!child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 })
  }

  const blockedTopics = child.topicRestrictions
    .filter((r) => r.isBlocked)
    .map((r) => r.category as TopicCategory)

  const customKeywords = child.topicRestrictions.flatMap((r) => r.customKeywords)

  const customTopics = child.customTopics.map((t) => ({
    name: t.name,
    description: t.description,
  }))

  // 5. INPUT SAFETY PIPELINE
  const inputResult = await runInputPipeline(message, blockedTopics, customKeywords)

  // Get or create conversation
  let convoId = conversationId
  if (!convoId) {
    const convo = await prisma.conversation.create({
      data: { childId, title: message.slice(0, 50) },
    })
    convoId = convo.id
  }

  if (!inputResult.allowed) {
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: convoId,
        role: 'USER',
        content: message,
        inputFlagged: true,
        flagReason: inputResult.moderation.reason,
        moderationScore: inputResult.moderation.score,
      },
    })

    await createAlert({
      parentId,
      childId,
      messageId: savedMessage.id,
      alertType: 'INPUT_BLOCKED',
      description: `${displayName} asked about blocked content: "${message.slice(0, 100)}"`,
    })

    const safeResponse = buildBlockedMessage(tier, displayName)

    await prisma.message.create({
      data: {
        conversationId: convoId,
        role: 'ASSISTANT',
        content: safeResponse,
      },
    })

    return NextResponse.json({
      response: safeResponse,
      conversationId: convoId,
      blocked: true,
    })
  }

  // 6. Save user message
  const userMessage = await prisma.message.create({
    data: {
      conversationId: convoId,
      role: 'USER',
      content: message,
    },
  })

  // 7. Build conversation history for context
  const history = await prisma.message.findMany({
    where: { conversationId: convoId, id: { not: userMessage.id } },
    orderBy: { createdAt: 'asc' },
    take: 10,
    select: { role: true, content: true },
  })

  const config = AGE_TIER_CONFIGS[tier]
  const systemPrompt = buildSystemPrompt(tier, displayName, blockedTopics, customKeywords, customTopics)

  // 8. STREAMING RESPONSE
  const { model } = getChatClient()
  const aiClient = getAiClient()

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''

      try {
        const aiStream = await aiClient.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.map((m) => ({
              role: m.role.toLowerCase() as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user', content: message },
          ],
          max_tokens: config.maxTokens,
          temperature: tier === 'CREATOR' ? 0.7 : 0.8,
          stream: true,
        })

        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullResponse += delta
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }

        // 9. OUTPUT SAFETY PIPELINE
        const outputResult = await runOutputPipeline(fullResponse)

        if (!outputResult.allowed) {
          const fallback = buildBlockedMessage(tier, displayName)

          await prisma.message.create({
            data: {
              conversationId: convoId!,
              role: 'ASSISTANT',
              content: fallback,
              outputFlagged: true,
              flagReason: outputResult.moderation.reason,
              moderationScore: outputResult.moderation.score,
            },
          })

          await createAlert({
            parentId,
            childId,
            alertType: 'OUTPUT_FLAGGED',
            description: `AI generated flagged content for ${displayName} (replaced with safe message)`,
          })

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ replace: fallback })}\n\n`)
          )
        } else {
          await prisma.message.create({
            data: {
              conversationId: convoId!,
              role: 'ASSISTANT',
              content: fullResponse,
            },
          })
        }

        // 10. Increment usage (~1 minute per interaction)
        await incrementUsage(childId, 1)

        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ done: true, conversationId: convoId })}\n\n`
          )
        )
      } catch (error) {
        console.error('[chat]', error)
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ error: 'Something went wrong. Please try again!' })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
