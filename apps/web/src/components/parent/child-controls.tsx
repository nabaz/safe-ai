'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface ChildControlsProps {
  childId: string
  isPaused: boolean
  dailyLimitMinutes: number
  blackoutStart: string | null
  blackoutEnd: string | null
}

export function ChildControls({
  childId,
  isPaused: initialPaused,
  dailyLimitMinutes: initialLimit,
  blackoutStart: initialStart,
  blackoutEnd: initialEnd,
}: ChildControlsProps) {
  const router = useRouter()
  const [isPaused, setIsPaused] = useState(initialPaused)
  const [dailyLimit, setDailyLimit] = useState(initialLimit)
  const [blackoutStart, setBlackoutStart] = useState(initialStart ?? '')
  const [blackoutEnd, setBlackoutEnd] = useState(initialEnd ?? '')
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)

  const togglePause = async () => {
    setToggling(true)
    const res = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaused: !isPaused }),
    })

    setToggling(false)

    if (res.ok) {
      setIsPaused((p) => !p)
      toast.success(isPaused ? 'Access resumed' : 'Access paused')
      router.refresh()
    } else {
      toast.error('Failed to update access')
    }
  }

  const saveControls = async () => {
    setSaving(true)
    const res = await fetch(`/api/children/${childId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailyLimitMinutes: dailyLimit,
        blackoutStart: blackoutStart || null,
        blackoutEnd: blackoutEnd || null,
      }),
    })

    setSaving(false)

    if (res.ok) {
      toast.success('Controls saved')
      router.refresh()
    } else {
      toast.error('Failed to save')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-500 mb-4">Controls</h2>

      {/* Remote pause */}
      <div className="flex items-center justify-between mb-5 pb-5 border-b border-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-900">Remote pause</p>
          <p className="text-xs text-gray-400 mt-0.5">Instantly block access</p>
        </div>
        <Button
          variant={isPaused ? 'secondary' : 'danger'}
          size="sm"
          loading={toggling}
          onClick={togglePause}
        >
          {isPaused ? (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pause access
            </>
          )}
        </Button>
      </div>

      {/* Daily limit */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 block mb-1.5">
          Daily limit: <span className="text-indigo-600">{dailyLimit} min</span>
        </label>
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={dailyLimit}
          onChange={(e) => setDailyLimit(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-300 mt-1">
          <span>5m</span>
          <span>3h</span>
        </div>
      </div>

      {/* Blackout window */}
      <div className="mb-5">
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Blackout hours (no access)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={blackoutStart}
            onChange={(e) => setBlackoutStart(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="time"
            value={blackoutEnd}
            onChange={(e) => setBlackoutEnd(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">e.g. 21:00 to 07:00 for overnight</p>
      </div>

      <Button onClick={saveControls} loading={saving} size="sm" className="w-full">
        Save controls
      </Button>
    </div>
  )
}
