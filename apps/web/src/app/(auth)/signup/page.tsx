'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    coppaConsent: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!form.coppaConsent) {
      setError('You must agree to the parental consent to continue')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        coppaConsent: true,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(data.error ?? 'Something went wrong')
      return
    }

    // Auto-login after signup
    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    toast.success('Account created! Add your first child profile.')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl">🌟</span>
            <span className="font-bold text-gray-900">KidAI Playground</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your family account</h1>
          <p className="text-gray-500 mt-1 text-sm">You&apos;re signing up as a parent</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Your name"
              type="text"
              id="displayName"
              placeholder="e.g. Sarah Johnson"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
            />
            <Input
              label="Email address"
              type="email"
              id="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <Input
              label="Confirm password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
            />

            {/* COPPA Consent — legally required */}
            <div className="bg-blue-50 rounded-xl p-4">
              <label className="flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.coppaConsent}
                  onChange={(e) => setForm((f) => ({ ...f, coppaConsent: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  <strong>Parental consent (required):</strong> I confirm that I am the parent or legal 
                  guardian of the children who will use this service. I agree to the{' '}
                  <Link href="/privacy" className="text-indigo-600 hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  and{' '}
                  <Link href="/terms" className="text-indigo-600 hover:underline">
                    Terms of Service
                  </Link>
                  , and provide verifiable parental consent as required by COPPA.
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-2">
              Create account
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 text-center">
          No credit card required. No ads. No data sold. COPPA + GDPR-K compliant.
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
