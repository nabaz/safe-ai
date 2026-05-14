'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface ChildAccessCardProps {
  childId: string
  displayName: string
}

export function ChildAccessCard({ childId, displayName }: ChildAccessCardProps) {
  const [newPin, setNewPin] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copiedId, setCopiedId] = useState(false)
  const [copiedPin, setCopiedPin] = useState(false)

  const resetPin = async () => {
    if (!confirm(`Reset ${displayName}'s PIN? Their current PIN will stop working immediately.`)) {
      return
    }

    setResetting(true)
    const res = await fetch(`/api/children/${childId}/reset-pin`, { method: 'POST' })
    const data = await res.json()
    setResetting(false)

    if (!res.ok) {
      toast.error('Failed to reset PIN')
      return
    }

    setNewPin(data.pin)
    toast.success('New PIN generated — share it with ' + displayName)
  }

  const copyId = () => {
    navigator.clipboard.writeText(childId)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const copyPin = () => {
    if (newPin) {
      navigator.clipboard.writeText(newPin)
      setCopiedPin(true)
      setTimeout(() => setCopiedPin(false), 2000)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-500 mb-4">Child access</h2>

      {/* Login URL */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">Login page</p>
        <p className="text-sm font-mono text-indigo-600">/child</p>
      </div>

      {/* Profile ID */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">Profile ID</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2 font-mono text-gray-700 truncate border border-gray-100">
            {childId}
          </code>
          <button
            onClick={copyId}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            {copiedId ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* PIN */}
      <div className="mb-5">
        <p className="text-xs text-gray-400 mb-1">PIN</p>
        {newPin ? (
          <div className="bg-indigo-50 rounded-xl p-4 text-center">
            <p className="text-xs text-indigo-500 font-medium mb-1 uppercase tracking-wide">
              New PIN — share with {displayName}
            </p>
            <p className="text-3xl font-bold text-indigo-700 font-mono tracking-widest mb-3">
              {newPin}
            </p>
            <button
              onClick={copyPin}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {copiedPin ? (
                <><Check className="h-3 w-3" /> Copied!</>
              ) : (
                <><Copy className="h-3 w-3" /> Copy PIN</>
              )}
            </button>
            <p className="text-xs text-indigo-400 mt-2">
              This PIN won&apos;t be shown again after you leave this page.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500 border border-gray-100">
            PINs are hashed for security — they can&apos;t be retrieved, only reset.
          </div>
        )}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        loading={resetting}
        onClick={resetPin}
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
        {newPin ? 'Reset again' : 'Reset PIN'}
      </Button>
    </div>
  )
}
