import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@kidai/db'
import { redirect } from 'next/navigation'
import { formatDuration } from '@kidai/shared'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Settings } from 'lucide-react'

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const today = new Date()
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  const children = await prisma.childProfile.findMany({
    where: { parentId: session.user.id },
    include: {
      usageLogs: { where: { date: todayDate } },
      _count: { select: { conversations: true, alerts: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage profiles, controls and topic restrictions
          </p>
        </div>
        <Link href="/dashboard/children/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add child
          </Button>
        </Link>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">👶</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No children yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Create a profile for each child. You&apos;ll get a PIN they can use to log in.
          </p>
          <Link href="/dashboard/children/new">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Add child profile
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {children.map((child) => {
            const minutesToday = child.usageLogs[0]?.minutesUsed ?? 0
            const usagePercent = Math.min(100, (minutesToday / child.dailyLimitMinutes) * 100)

            return (
              <div
                key={child.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  {/* Left: avatar + info */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                      {child.avatarEmoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-lg">{child.displayName}</p>
                        {child.isPaused ? (
                          <Badge variant="warning">Paused</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="capitalize">{child.ageTier.toLowerCase()} tier</span>
                        <span>·</span>
                        <span>{child._count.conversations} conversations</span>
                        <span>·</span>
                        <span>{child._count.alerts} alerts</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: usage + manage */}
                  <div className="flex items-center gap-6">
                    {/* Today's usage bar */}
                    <div className="w-36 hidden sm:block">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Today</span>
                        <span>
                          {formatDuration(minutesToday)} / {formatDuration(child.dailyLimitMinutes)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent >= 90
                              ? 'bg-red-500'
                              : usagePercent >= 70
                                ? 'bg-yellow-500'
                                : 'bg-indigo-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>

                    <Link href={`/dashboard/children/${child.id}`}>
                      <Button variant="secondary" size="sm">
                        <Settings className="h-3.5 w-3.5 mr-1.5" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick tip */}
      {children.length > 0 && (
        <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <strong>Tip:</strong> Click <strong>Manage</strong> on any child to set time limits,
          blackout hours, topic restrictions, and view their conversation history.
        </div>
      )}
    </div>
  )
}
