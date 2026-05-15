import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@kidai/db'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Shield } from 'lucide-react'

const ALERT_CONFIG = {
  INPUT_BLOCKED: {
    icon: Shield,
    label: 'Blocked input',
    variant: 'warning' as const,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
  OUTPUT_FLAGGED: {
    icon: AlertTriangle,
    label: 'Flagged output',
    variant: 'danger' as const,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  TIME_LIMIT_REACHED: {
    icon: Clock,
    label: 'Time limit',
    variant: 'info' as const,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  BLACKOUT_ATTEMPTED: {
    icon: Clock,
    label: 'Blackout attempt',
    variant: 'info' as const,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
}

export default async function AlertsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const alerts = await prisma.alert.findMany({
    where: { parentId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      child: { select: { displayName: true, avatarEmoji: true } },
    },
  })

  // Mark all as read
  await prisma.alert.updateMany({
    where: { parentId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  })

  // @ts-ignore - type inference issue with reduce
  const grouped: Record<string, any[]> = alerts.reduce(
    (acc: Record<string, any[]>, alert: any) => {
      const date = new Date(alert.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      ;(acc[date] ??= []).push(alert)
      return acc
    },
    {}
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-500 text-sm mt-1">
          Safety events from your children&apos;s sessions
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Shield className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">All clear</h2>
          <p className="text-gray-400 text-sm">No safety events to report.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([date, dayAlerts]) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {date}
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                 {dayAlerts.map((alert) => {
                   const config = ALERT_CONFIG[alert.alertType as keyof typeof ALERT_CONFIG]
                   const Icon = config.icon
                  return (
                    <div key={alert.id} className="flex items-start gap-4 p-4">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900">
                            {alert.child.avatarEmoji} {alert.child.displayName}
                          </span>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(alert.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
