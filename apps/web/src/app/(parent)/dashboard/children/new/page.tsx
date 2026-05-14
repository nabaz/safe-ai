'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const AVATARS = ['🦊', '🐻', '🐱', '🐶', '🦁', '🐼', '🐨', '🦋', '🌟', '🚀']

export default function NewChildPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [createdPin, setCreatedPin] = useState<string | null>(null)
  const [childName, setChildName] = useState('')
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    dateOfBirth: '',
    avatarEmoji: '🦊',
    dailyLimitMinutes: 60,
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    setCreatedPin(data.pin)
    setChildName(data.child.displayName)
    toast.success(`${data.child.displayName}'s profile created!`)
  }

  const copyPin = () => {
    if (createdPin) {
      navigator.clipboard.writeText(createdPin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (createdPin) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {childName}&apos;s profile is ready!
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Share this PIN with {childName}. They&apos;ll use it to log into the child app.
            <br />
            <strong>You won&apos;t see this PIN again</strong> — save it somewhere safe.
          </p>

          <div className="bg-indigo-50 rounded-2xl p-6 mb-6">
            <p className="text-xs text-indigo-500 font-medium mb-2 uppercase tracking-wide">
              {childName}&apos;s PIN
            </p>
            <p className="text-4xl font-bold text-indigo-700 font-mono tracking-widest">
              {createdPin}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={copyPin} className="flex-1">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy PIN
                </>
              )}
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="flex-1">
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add a child profile</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Avatar picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Pick an avatar
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, avatarEmoji: emoji }))}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                    form.avatarEmoji === emoji
                      ? 'bg-indigo-100 ring-2 ring-indigo-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Child's first name"
            type="text"
            id="displayName"
            placeholder="e.g. Emma"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            required
          />

          <Input
            label="Date of birth"
            type="date"
            id="dateOfBirth"
            value={form.dateOfBirth}
            onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            required
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Daily time limit: {form.dailyLimitMinutes} minutes
            </label>
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={form.dailyLimitMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, dailyLimitMinutes: Number(e.target.value) }))
              }
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 min</span>
              <span>3 hours</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <Button type="submit" loading={loading} size="lg" className="mt-2">
            Create profile
          </Button>
        </form>
      </div>

      <div className="mt-4 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <strong>Age tiers are set automatically:</strong> Explorer (4–7), Builder (8–11), Creator (12–15). 
        Topics and vocabulary adapt to your child&apos;s age.
      </div>
    </div>
  )
}
