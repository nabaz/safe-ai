import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@kidai/db'
import { redirect } from 'next/navigation'
import { formatDuration } from '@kidai/shared'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, Users, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const parentId = session.user.id

  const today = new Date()
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  const [children, unreadAlerts, recentAlerts] = await Promise.all([
    prisma.childProfile.findMany({
      where: { parentId },
      include: {
        usageLogs: {
          where: { date: todayDate },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.alert.count({ where: { parentId, read: false } }),
    prisma.alert.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        child: { select: { displayName: true, avatarEmoji: true } },
      },
    }),
  ])

  const totalMinutesToday = children.reduce((sum, child) => {
    return sum + (child.usageLogs[0]?.minutesUsed ?? 0)
  }, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link href="/dashboard/children/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add child
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-sm text-gray-500">Children</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{children.length}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Clock className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Time today</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {totalMinutesToday > 0 ? formatDuration(totalMinutesToday) : '—'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">New alerts</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{unreadAlerts}</p>
        </div>
      </div>

      {/* Children cards */}
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">👶</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Add your first child</h2>
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
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Your children
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => {
              const minutesToday = child.usageLogs[0]?.minutesUsed ?? 0
              return (
                <Link
                  key={child.id}
                  href={`/dashboard/children/${child.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl">
                        {child.avatarEmoji}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{child.displayName}</p>
                        <p className="text-xs text-gray-500">{child.ageTier} tier</p>
                      </div>
                    </div>
                    {child.isPaused ? (
                      <Badge variant="warning">Paused</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Today</span>
                    <span className="font-medium text-gray-900">
                      {formatDuration(minutesToday)} / {formatDuration(child.dailyLimitMinutes)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (minutesToday / child.dailyLimitMinutes) * 100)}%`,
                      }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Recent alerts
            </h2>
            <Link href="/dashboard/alerts" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-4">
                <span className="text-lg">{alert.child.avatarEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{alert.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                {!alert.read && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
