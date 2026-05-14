'use client'

import { useState } from 'react'
import { AGE_TIER_CONFIGS, TOPIC_LABELS } from '@kidai/shared'
import type { AgeTier, TopicCategory } from '@kidai/shared'
import { cn } from '@/lib/cn'
import { Plus, X, ChevronDown, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

interface TopicRestriction {
  category: string
  isBlocked: boolean
  customKeywords: string[]
}

interface CustomTopic {
  id: string
  name: string
  description: string | null
  isActive: boolean
}

interface TopicManagerProps {
  childId: string
  ageTier: string
  restrictions: TopicRestriction[]
  customTopics: CustomTopic[]
}

export function TopicManager({
  childId,
  ageTier,
  restrictions,
  customTopics: initialCustomTopics,
}: TopicManagerProps) {
  const config = AGE_TIER_CONFIGS[ageTier as AgeTier]

  // ── Built-in topic state ───────────────────────────────────────────────────
  const [blocked, setBlocked] = useState<Record<string, boolean>>(
    Object.fromEntries(restrictions.map((r) => [r.category, r.isBlocked]))
  )
  const [keywords, setKeywords] = useState<Record<string, string[]>>(
    Object.fromEntries(restrictions.map((r) => [r.category, r.customKeywords]))
  )
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({})
  const [savingTopic, setSavingTopic] = useState<string | null>(null)

  // ── Custom topics state ───────────────────────────────────────────────────
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>(initialCustomTopics)
  const [newTopicName, setNewTopicName] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // ── Built-in topic helpers ────────────────────────────────────────────────
  const toggleTopic = async (category: TopicCategory, currentlyBlocked: boolean) => {
    setSavingTopic(category)
    const res = await fetch(`/api/children/${childId}/topics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        isBlocked: !currentlyBlocked,
        customKeywords: keywords[category] ?? [],
      }),
    })
    setSavingTopic(null)
    if (res.ok) {
      setBlocked((prev) => ({ ...prev, [category]: !currentlyBlocked }))
      toast.success(!currentlyBlocked ? `${TOPIC_LABELS[category]} blocked` : `${TOPIC_LABELS[category]} unblocked`)
    } else {
      toast.error('Failed to update topic')
    }
  }

  const addKeyword = async (category: TopicCategory) => {
    const kw = newKeyword[category]?.trim().toLowerCase()
    if (!kw) return
    const updated = [...(keywords[category] ?? []), kw]
    setSavingTopic(category)
    const res = await fetch(`/api/children/${childId}/topics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, isBlocked: blocked[category] ?? false, customKeywords: updated }),
    })
    setSavingTopic(null)
    if (res.ok) {
      setKeywords((prev) => ({ ...prev, [category]: updated }))
      setNewKeyword((prev) => ({ ...prev, [category]: '' }))
      toast.success(`"${kw}" added`)
    } else {
      toast.error('Failed to add keyword')
    }
  }

  const removeKeyword = async (category: TopicCategory, kw: string) => {
    const updated = (keywords[category] ?? []).filter((k) => k !== kw)
    setSavingTopic(category)
    const res = await fetch(`/api/children/${childId}/topics`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, isBlocked: blocked[category] ?? false, customKeywords: updated }),
    })
    setSavingTopic(null)
    if (res.ok) {
      setKeywords((prev) => ({ ...prev, [category]: updated }))
    } else {
      toast.error('Failed to remove keyword')
    }
  }

  // ── Custom topic helpers ──────────────────────────────────────────────────
  const addCustomTopic = async () => {
    if (!newTopicName.trim()) return
    setAddingTopic(true)
    const res = await fetch(`/api/children/${childId}/custom-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTopicName.trim(), description: newTopicDesc.trim() || undefined }),
    })
    const data = await res.json()
    setAddingTopic(false)
    if (res.ok) {
      setCustomTopics((prev) => [...prev, data.topic])
      setNewTopicName('')
      setNewTopicDesc('')
      setShowAddForm(false)
      toast.success(`"${data.topic.name}" added`)
    } else {
      toast.error(data.error ?? 'Failed to add topic')
    }
  }

  const toggleCustomTopic = async (topic: CustomTopic) => {
    const res = await fetch(`/api/children/${childId}/custom-topics/${topic.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !topic.isActive }),
    })
    if (res.ok) {
      setCustomTopics((prev) => prev.map((t) => t.id === topic.id ? { ...t, isActive: !t.isActive } : t))
      toast.success(!topic.isActive ? `"${topic.name}" enabled` : `"${topic.name}" disabled`)
    } else {
      toast.error('Failed to update topic')
    }
  }

  const deleteCustomTopic = async (topic: CustomTopic) => {
    if (!confirm(`Remove "${topic.name}"?`)) return
    const res = await fetch(`/api/children/${childId}/custom-topics/${topic.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCustomTopics((prev) => prev.filter((t) => t.id !== topic.id))
      toast.success(`"${topic.name}" removed`)
    } else {
      toast.error('Failed to remove topic')
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Built-in topics — tile grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-500">Topic controls</h2>
          <p className="text-xs text-gray-400 mt-1">
            Tap to block/allow. Click the arrow on any tile to add blocked keywords within that topic.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {config.allowedTopics.map((topic) => {
            const isBlocked = blocked[topic] ?? false
            const isSaving = savingTopic === topic
            const topicKeywords = keywords[topic] ?? []
            const isExpanded = expandedTopic === topic

            return (
              <div key={topic} className="flex flex-col">
                {/* Tile */}
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-xl border transition-all',
                    isBlocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
                    isSaving && 'opacity-50'
                  )}
                >
                  {/* Main toggle area */}
                  <button
                    onClick={() => toggleTopic(topic, isBlocked)}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-2 flex-1 px-3 py-2.5 text-sm font-medium text-left truncate',
                      isBlocked ? 'text-red-700' : 'text-green-700'
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isBlocked ? 'bg-red-500' : 'bg-green-500')} />
                    <span className="truncate">{TOPIC_LABELS[topic]}</span>
                    {topicKeywords.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-1.5 leading-5 flex-shrink-0">
                        {topicKeywords.length}
                      </span>
                    )}
                  </button>

                  {/* Expand arrow */}
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : topic)}
                    className={cn(
                      'pr-2.5 pl-1 py-2.5 flex-shrink-0 transition-colors',
                      isBlocked ? 'text-red-300 hover:text-red-600' : 'text-green-300 hover:text-green-600'
                    )}
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                </div>

                {/* Keyword drawer — spans full width below tile */}
                {isExpanded && (
                  <div className="mt-1 bg-gray-50 rounded-xl border border-gray-100 p-3">
                    <p className="text-xs text-gray-500 mb-2">Block specific words within this topic:</p>
                    {topicKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {topicKeywords.map((kw) => (
                          <span key={kw} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs rounded-full px-2 py-0.5">
                            {kw}
                            <button onClick={() => removeKeyword(topic, kw)} className="hover:text-red-600">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Add keyword..."
                        value={newKeyword[topic] ?? ''}
                        onChange={(e) => setNewKeyword((p) => ({ ...p, [topic]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addKeyword(topic)}
                        className="flex-1 text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <Button size="sm" variant="secondary" onClick={() => addKeyword(topic)} disabled={!newKeyword[topic]?.trim()} className="h-7 text-xs px-2">
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">Green = allowed. Red = blocked. Tap to toggle.</p>
      </div>

      {/* ── Custom topics — tile grid ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-500">Custom topics</h2>
            <p className="text-xs text-gray-400 mt-1">
              Add topics outside the standard curriculum — the AI will allow them for this child.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add topic
          </Button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-4 flex flex-col gap-3">
            <Input
              label="Topic name"
              placeholder="e.g. Football, Music, Minecraft"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomTopic()}
            />
            <Input
              label="Description (optional)"
              placeholder="e.g. age-appropriate football rules and history"
              value={newTopicDesc}
              onChange={(e) => setNewTopicDesc(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" loading={addingTopic} disabled={!newTopicName.trim()} onClick={addCustomTopic}>
                Add topic
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setNewTopicName(''); setNewTopicDesc('') }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Custom topic tiles */}
        {customTopics.length === 0 && !showAddForm ? (
          <div className="text-center py-6 text-sm text-gray-400">
            <Tag className="h-7 w-7 mx-auto mb-2 text-gray-200" />
            No custom topics yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {customTopics.map((topic) => (
              <div
                key={topic.id}
                className={cn(
                  'flex items-center gap-1 rounded-xl border transition-all',
                  topic.isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
                )}
              >
                <button
                  onClick={() => toggleCustomTopic(topic)}
                  className={cn(
                    'flex items-center gap-2 flex-1 px-3 py-2.5 text-sm font-medium text-left truncate',
                    topic.isActive ? 'text-indigo-700' : 'text-gray-400'
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', topic.isActive ? 'bg-indigo-500' : 'bg-gray-300')} />
                  <span className="truncate">{topic.name}</span>
                </button>
                <button
                  onClick={() => deleteCustomTopic(topic)}
                  className="pr-2.5 pl-1 py-2.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {customTopics.length > 0 && (
          <p className="text-xs text-gray-400 mt-4">Indigo = active. Tap to toggle. X to remove.</p>
        )}
      </div>
    </div>
  )
}
