import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@kidai/db'
import { redirect, notFound } from 'next/navigation'
import { formatDuration } from '@kidai/shared'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ChildControls } from '@/components/parent/child-controls'
import { ChildAccessCard } from '@/components/parent/child-access-card'
import { TopicManager } from '@/components/parent/topic-manager'
import { ArrowLeft, MessageSquare, Code2, Zap, TrendingUp } from 'lucide-react'

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { childId } = await params

  const today = new Date()
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, parentId: session.user.id },
    include: {
      topicRestrictions: true,
      customTopics: { orderBy: { createdAt: 'asc' } },
      usageLogs: { where: { date: todayDate } },
      conversations: {
        orderBy: { startedAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { messages: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true, inputFlagged: true, outputFlagged: true },
          },
        },
      },
      codeLessonProgress: true,
      dailyChallenges: {
        where: { date: todayDate },
      },
    },
  })

  if (!child) notFound()

  const minutesToday = child.usageLogs[0]?.minutesUsed ?? 0
  const usagePercent = Math.min(100, (minutesToday / child.dailyLimitMinutes) * 100)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/children" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{child.avatarEmoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.displayName}</h1>
            <p className="text-sm text-gray-500 capitalize">{child.ageTier.toLowerCase()} tier</p>
          </div>
        </div>
        <div className="ml-auto">
          {child.isPaused ? (
            <Badge variant="warning">Paused</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
        </div>
      </div>

      {/* Today's usage */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Today&apos;s usage</h2>
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900">{formatDuration(minutesToday)}</span>
          <span className="text-sm text-gray-400">of {formatDuration(child.dailyLimitMinutes)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Code Lab Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">Lessons Completed</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900">{child.codeLessonProgress.length}</p>
          <p className="text-xs text-blue-700 mt-1">Static curriculum lessons</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">Today's Challenges</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900">
            {child.dailyChallenges.length > 0 
              ? child.dailyChallenges[0]?.completedIds?.length ?? 0 
              : 0}
            <span className="text-sm text-purple-700 ml-1">/5</span>
          </p>
          <p className="text-xs text-purple-700 mt-1">AI-generated daily challenges</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-sm font-semibold text-green-900">Activity</h3>
          </div>
          <p className="text-3xl font-bold text-green-900">
            {child.codeLessonProgress.length > 0 ? '✅' : '—'}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {child.codeLessonProgress.length > 0 
              ? 'Actively coding'
              : 'Not started yet'}
          </p>
        </div>
      </div>

      {/* Controls + Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChildControls
          childId={child.id}
          isPaused={child.isPaused}
          dailyLimitMinutes={child.dailyLimitMinutes}
          blackoutStart={child.blackoutStart}
          blackoutEnd={child.blackoutEnd}
        />

        {/* Recent conversations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Recent conversations</h2>
          {child.conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No conversations yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {child.conversations.map((convo) => {
                const lastMsg = convo.messages[0]
                const hasFlagged = lastMsg?.inputFlagged || lastMsg?.outputFlagged
                return (
                  <Link
                    key={convo.id}
                    href={`/dashboard/children/${child.id}/conversations/${convo.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {convo.title ?? 'Conversation'}
                      </p>
                      {lastMsg && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {lastMsg.content.slice(0, 60)}...
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {hasFlagged && <Badge variant="danger">Flagged</Badge>}
                      <span className="text-xs text-gray-300">{convo._count.messages} msgs</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Access card */}
      <div className="mb-6">
        <ChildAccessCard childId={child.id} displayName={child.displayName} />
      </div>

      {/* Topic manager — built-in blocks + custom topics */}
      <TopicManager
        childId={child.id}
        ageTier={child.ageTier}
        restrictions={child.topicRestrictions}
        customTopics={child.customTopics}
      />
    </div>
  )
}
