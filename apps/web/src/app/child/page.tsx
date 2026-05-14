import { getChildSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { ChildLogin } from '@/components/child/child-login'
import { ChildChat } from '@/components/child/child-chat'
import { checkAccessAllowed } from '@/lib/usage'

export default async function ChildPage() {
  const session = await getChildSession()

  // Not logged in — show PIN entry
  if (!session) {
    return <ChildLogin />
  }

  // Check access
  const access = await checkAccessAllowed(session.childId)

  if (!access.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {access.reason === 'paused' ? '⏸️' : access.reason === 'daily_limit' ? '⏰' : '🌙'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {access.reason === 'paused'
              ? 'Paused by your parent'
              : access.reason === 'daily_limit'
                ? "Time's up for today!"
                : 'Not chat time yet!'}
          </h2>
          <p className="text-gray-500">
            {access.reason === 'paused'
              ? 'Your parent has paused your access. Ask them to turn it back on!'
              : access.reason === 'daily_limit'
                ? "You've used all your chat time today. Come back tomorrow!"
                : "It's outside your allowed hours. Check back later!"}
          </p>
        </div>
      </div>
    )
  }

  return <ChildChat session={session} />
}
