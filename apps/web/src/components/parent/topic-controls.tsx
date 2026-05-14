'use client'

import { useState } from 'react'
import { AGE_TIER_CONFIGS, TOPIC_LABELS } from '@kidai/shared'
import type { AgeTier, TopicCategory } from '@kidai/shared'
import { cn } from '@/lib/cn'
import toast from 'react-hot-toast'

interface TopicRestriction {
  category: string
  isBlocked: boolean
  customKeywords: string[]
}

interface TopicControlsProps {
  childId: string
  ageTier: string
  restrictions: TopicRestriction[]
}

export function TopicControls({ childId, ageTier, restrictions }: TopicControlsProps) {
  const config = AGE_TIER_CONFIGS[ageTier as AgeTier]
  const [blocked, setBlocked] = useState<Record<string, boolean>>(
    Object.fromEntries(restrictions.map((r) => [r.category, r.isBlocked]))
  )
  const [saving, setSaving] = useState<string | null>(null)

  const toggleTopic = async (category: TopicCategory, currentlyBlocked: boolean) => {
    setSaving(category)

    const res = await fetch(`/api/children/${childId}/topics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, isBlocked: !currentlyBlocked }),
    })

    setSaving(null)

    if (res.ok) {
      setBlocked((prev) => ({ ...prev, [category]: !currentlyBlocked }))
      toast.success(
        !currentlyBlocked
          ? `${TOPIC_LABELS[category]} blocked`
          : `${TOPIC_LABELS[category]} unblocked`
      )
    } else {
      toast.error('Failed to update topic')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500">Topic controls</h2>
        <p className="text-xs text-gray-400 mt-1">
          These are the topics available for the {config.label} tier. Toggle to block any category.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {config.allowedTopics.map((topic) => {
          const isBlocked = blocked[topic] ?? false
          const isSaving = saving === topic
          return (
            <button
              key={topic}
              onClick={() => toggleTopic(topic, isBlocked)}
              disabled={isSaving}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                isBlocked
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-green-50 border-green-200 text-green-700',
                isSaving && 'opacity-50 cursor-wait'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  isBlocked ? 'bg-red-500' : 'bg-green-500'
                )}
              />
              <span className="truncate">{TOPIC_LABELS[topic]}</span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Green = allowed. Red = blocked. Tap to toggle.
      </p>
    </div>
  )
}
