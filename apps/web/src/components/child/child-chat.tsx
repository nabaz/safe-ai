'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AGE_TIER_CONFIGS } from '@kidai/shared'
import type { ChildSessionPayload } from '@kidai/shared'
import { cn } from '@/lib/cn'
import { Send, LogOut, Plus, Trash2, Code2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { extractGameParts } from './games/types'
import { GameRenderer } from './games/game-renderer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocked?: boolean
}

interface ChildChatProps {
  session: ChildSessionPayload
}

// Tier-specific visual themes
const TIER_THEMES = {
  EXPLORER: {
    bg: 'from-green-100 via-yellow-50 to-emerald-100',
    userBubble: 'bg-green-500 text-white',
    aiBubble: 'bg-white text-gray-800 border border-green-100',
    inputBorder: 'border-green-200 focus:border-green-400',
    sendBtn: 'bg-green-500 hover:bg-green-600',
    headerBg: 'bg-white border-green-100',
  },
  BUILDER: {
    bg: 'from-blue-100 via-indigo-50 to-cyan-100',
    userBubble: 'bg-blue-500 text-white',
    aiBubble: 'bg-white text-gray-800 border border-blue-100',
    inputBorder: 'border-blue-200 focus:border-blue-400',
    sendBtn: 'bg-blue-500 hover:bg-blue-600',
    headerBg: 'bg-white border-blue-100',
  },
  CREATOR: {
    bg: 'from-purple-100 via-pink-50 to-indigo-100',
    userBubble: 'bg-purple-600 text-white',
    aiBubble: 'bg-white text-gray-800 border border-purple-100',
    inputBorder: 'border-purple-200 focus:border-purple-400',
    sendBtn: 'bg-purple-600 hover:bg-purple-700',
    headerBg: 'bg-white border-purple-100',
  },
}

export function ChildChat({ session }: ChildChatProps) {
  const router = useRouter()
  const config = AGE_TIER_CONFIGS[session.tier]
  const theme = TIER_THEMES[session.tier]

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: getWelcomeMessage(session.tier, session.displayName, config.personaName),
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [accessError, setAccessError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setAccessError(null)

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Add streaming placeholder
    const streamingId = `streaming-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: streamingId, role: 'assistant', content: '' },
    ])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })

      if (res.status === 403) {
        const data = await res.json()
        setAccessError(data.error)
        setMessages((prev) => prev.filter((m) => m.id !== streamingId))
        setIsStreaming(false)
        return
      }

      // Handle non-streaming responses (blocked messages, errors, 503)
      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json()
        if (res.status === 503) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? { ...m, content: "I'm not quite ready yet! Ask a parent to finish setting me up." }
                : m
            )
          )
          setIsStreaming(false)
          return
        }
        if (data.conversationId) setConversationId(data.conversationId)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? { ...m, content: data.response, blocked: data.blocked }
              : m
          )
        )
        setIsStreaming(false)
        return
      }

      // Handle SSE stream
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response body')

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n').filter(Boolean)

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)
          try {
            const data = JSON.parse(jsonStr)

            if (data.delta) {
              fullContent += data.delta
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId ? { ...m, content: fullContent } : m
                )
              )
            }

            if (data.replace) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId ? { ...m, content: data.replace, blocked: true } : m
                )
              )
            }

            if (data.conversationId) {
              setConversationId(data.conversationId)
            }

            if (data.error) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? { ...m, content: "Oops! Something went wrong. Please try again!" }
                    : m
                )
              )
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith('streaming-')
            ? { ...m, content: "Oops! Something went wrong. Please try again!" }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      inputRef.current?.focus()
    }
  }, [input, isStreaming, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLogout = async () => {
    await fetch('/api/child-session', { method: 'DELETE' })
    router.refresh()
  }

  // Start a brand new conversation — clears messages and resets conversation ID
  const startNewChat = () => {
    if (isStreaming) return
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: getWelcomeMessage(session.tier, session.displayName, config.personaName),
      },
    ])
    setConversationId(undefined)
    setInput('')
    setAccessError(null)
    inputRef.current?.focus()
  }

  // Clear the current chat view — keeps the conversation in DB for parent, just clears the screen
  const clearChat = () => {
    if (isStreaming) return
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `All cleared! 🌟 What would you like to explore next, ${session.displayName}?`,
      },
    ])
    // Keep conversationId so subsequent messages still belong to the same conversation
    setInput('')
    setAccessError(null)
    inputRef.current?.focus()
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} flex flex-col`}>
      {/* Header */}
      <header className={`${theme.headerBg} border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-50 rounded-2xl flex items-center justify-center text-xl">
            {getPersonaEmoji(session.tier)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{config.personaName}</p>
            <p className="text-xs text-gray-400">Your AI coding & maths tutor</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 hidden sm:block mr-2">
            Your parent can see this chat
          </span>

          {/* Code Lab link */}
          <Link
            href="/child/code"
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-white transition-all',
              theme.sendBtn
            )}
            title="Code Lab"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Code Lab</span>
          </Link>

          {/* Clear chat */}
          <button
            onClick={clearChat}
            disabled={isStreaming}
            title="Clear screen"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {/* New chat */}
          <button
            onClick={startNewChat}
            disabled={isStreaming}
            title="New chat"
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-30',
              theme.sendBtn
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New chat</span>
          </button>

          {/* Log out */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all ml-1"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 max-w-2xl mx-auto w-full">
        {accessError && (
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl mb-2">⏰</p>
            <p className="text-gray-700 font-medium">{accessError}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                {getPersonaEmoji(session.tier)}
              </div>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-3xl px-4 py-3 shadow-sm',
                msg.role === 'user' ? theme.userBubble : theme.aiBubble,
                msg.content === '' && 'animate-pulse'
              )}
            >
              {msg.content === '' ? (
                <div className="flex gap-1 py-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                  <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                </div>
              ) : msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <AiBubble content={msg.content} tier={session.tier} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* AI disclosure — permanently visible per spec */}
      <div className="text-center py-1 text-xs text-gray-400 bg-transparent">
        You&apos;re talking to an AI. This is not a real person.
      </div>

      {/* Input */}
      <div className="px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 flex items-end gap-2 p-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder(session.tier, config.personaName)}
            rows={1}
            disabled={isStreaming}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none py-1 px-1 max-h-32',
              isStreaming && 'opacity-50'
            )}
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className={cn(
              'w-9 h-9 rounded-2xl flex items-center justify-center text-white transition-all flex-shrink-0',
              theme.sendBtn,
              (!input.trim() || isStreaming) && 'opacity-40 cursor-not-allowed'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AI bubble — handles plain text, markdown, and game blocks ────────────────
function AiBubble({ content, tier }: { content: string; tier: string }) {
  const { intro, game, outro } = extractGameParts(content)

  const mdComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
    ul: ({ children }: any) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-2 border-current opacity-70 pl-3 my-2 italic">{children}</blockquote>
    ),
    code: ({ children }: any) => (
      <code className="bg-black/10 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
    ),
    hr: () => <hr className="border-current opacity-20 my-2" />,
  }

  return (
    <div className="prose-chat text-sm leading-relaxed">
      {/* Intro text before game */}
      {intro && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {intro}
        </ReactMarkdown>
      )}

      {/* Game widget */}
      {game && <GameRenderer game={game} tier={tier} />}

      {/* Outro text after game */}
      {outro && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {outro}
        </ReactMarkdown>
      )}

      {/* No game block — render as normal markdown */}
      {!game && !intro && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  )
}

function getPersonaEmoji(tier: string): string {
  if (tier === 'EXPLORER') return '🤖'
  if (tier === 'BUILDER') return '🔧'
  return '✨'
}

function getWelcomeMessage(tier: string, childName: string, personaName: string): string {
  if (tier === 'EXPLORER') {
    return `Hi ${childName}! I'm ${personaName} 🤖 — your coding and maths buddy! I love numbers, puzzles, and teaching how computers think. Want to try some maths, learn about animals, or hear a cool story? What shall we explore?`
  }
  if (tier === 'BUILDER') {
    return `Hey ${childName}! I'm ${personaName} 🔧 — programmer, mathematician, and your personal tutor. We can tackle Python code, solve maths problems, explore science, or dig into history. I won't just give you answers — I'll help you figure them out. What are you working on?`
  }
  return `Hello ${childName}. I'm Nova ✨ — software engineer, mathematician, and your rigorous thinking partner. Bring me your hardest coding challenges, trickiest maths problems, or biggest questions about the world. I'll guide you to the answer — not hand it to you. What shall we work on?`
}

function getPlaceholder(tier: string, personaName: string): string {
  if (tier === 'EXPLORER') return `Ask ${personaName} about numbers, code, or anything!`
  if (tier === 'BUILDER') return `Ask a maths question, coding problem, or anything...`
  return `Bring your hardest problem — code, maths, science...`
}
