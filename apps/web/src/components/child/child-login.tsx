'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function ChildLogin() {
  const router = useRouter()
  const [childId, setChildId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/child-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: childId.trim(), pin: pin.trim().toUpperCase() }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError('That PIN is wrong. Ask your parent to check!')
      return
    }

    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌟</div>
          <h1 className="text-3xl font-bold text-gray-900">KidAI Playground</h1>
          <p className="text-gray-500 mt-2">Enter your ID and PIN to start!</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Your ID (ask your parent)
              </label>
              <input
                type="text"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                placeholder="Your profile ID"
                className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-center text-sm font-mono focus:outline-none focus:border-purple-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">
                Your secret PIN
              </label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="Enter your PIN"
                maxLength={10}
                className="w-full rounded-2xl border-2 border-gray-100 px-4 py-3 text-center text-2xl font-bold font-mono tracking-widest focus:outline-none focus:border-purple-400 transition-colors uppercase"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="rounded-2xl bg-purple-600 hover:bg-purple-700 mt-2">
              Let&apos;s go!
            </Button>
          </form>
        </div>

        {/* Transparency notice — required by spec */}
        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
          You are talking to an AI. Your parent can see your conversations.
        </p>
      </div>
    </div>
  )
}
