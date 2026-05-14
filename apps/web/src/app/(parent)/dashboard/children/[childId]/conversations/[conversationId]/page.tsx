import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@kidai/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ childId: string; conversationId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { childId, conversationId } = await params

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      childId,
      child: { parentId: session.user.id },
    },
    include: {
      child: { select: { displayName: true, ageTier: true, avatarEmoji: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          inputFlagged: true,
          outputFlagged: true,
          flagReason: true,
          createdAt: true,
        },
      },
    },
  })

  if (!conversation) notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/children/${childId}`}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span>{conversation.child.avatarEmoji}</span>
            <h1 className="text-xl font-bold text-gray-900">
              {conversation.child.displayName}&apos;s conversation
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date(conversation.startedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transparency banner */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 mb-6">
        {conversation.child.displayName} is informed that parents can view all conversations.
      </div>

      <div className="flex flex-col gap-3">
        {conversation.messages.map((msg) => {
          const isFlagged = msg.inputFlagged || msg.outputFlagged
          return (
            <div
              key={msg.id}
              className={cn('flex gap-3', msg.role === 'USER' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'ASSISTANT' && (
                <div className="w-8 h-8 rounded-2xl bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0 font-bold text-indigo-600">
                  AI
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  msg.role === 'USER'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-100 text-gray-900',
                  isFlagged && 'ring-2 ring-red-400'
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={cn(
                      'text-xs',
                      msg.role === 'USER' ? 'text-indigo-200' : 'text-gray-400'
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isFlagged && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      {msg.flagReason}
                    </span>
                  )}
                </div>
              </div>

              {msg.role === 'USER' && (
                <div className="w-8 h-8 rounded-2xl bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">
                  {conversation.child.avatarEmoji}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
