'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { AddChildModal } from './add-child-modal'
import { EditChildModal } from './edit-child-modal'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface ChildSwitcherProps {
  children: Child[]
  selectedChildId: string | null
  onSelectChild: (id: string) => void
  onRefresh: () => void
  progress?: Record<string, { done: number; total: number }>
}

function Ring({ color, done, total }: { color: string; done: number; total: number }) {
  const R = 29
  const C = 2 * Math.PI * R
  const p = total > 0 ? done / total : 0
  return (
    <svg width="66" height="66" viewBox="0 0 66 66" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="33" cy="33" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-gray-700" />
      <circle
        cx="33" cy="33" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - p)}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
  )
}

export function ChildSwitcher({ children, selectedChildId, onSelectChild, onRefresh, progress = {} }: ChildSwitcherProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)

  return (
    <>
      <div className="flex flex-wrap gap-3.5">
        {children.map((child) => {
          const color = child.avatar_color || '#6366f1'
          const prog = progress[child.id] || { done: 0, total: 0 }
          const isActive = selectedChildId === child.id
          return (
            <div
              key={child.id}
              className="group relative flex min-w-[132px] cursor-pointer flex-col items-center gap-2 rounded-2xl border p-4 pt-4 transition-transform duration-150 hover:-translate-y-0.5"
              style={{
                background: 'var(--card-bg)',
                borderColor: isActive ? `color-mix(in srgb, ${color} 55%, transparent)` : 'hsl(var(--border))',
                boxShadow: isActive
                  ? `0 0 0 2px color-mix(in srgb, ${color} 32%, transparent), var(--shadow-md)`
                  : 'var(--shadow-sm)',
              }}
              onClick={() => onSelectChild(child.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={`Select ${child.name}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectChild(child.id) } }}
            >
              {/* Edit affordance */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingChild(child) }}
                aria-label={`Edit ${child.name}`}
                title={`Edit ${child.name}`}
                className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <div className="relative h-[66px] w-[66px]">
                <Ring color={color} done={prog.done} total={prog.total} />
                <div
                  className="absolute inset-[8px] grid place-items-center overflow-hidden rounded-full text-xl font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
                >
                  {child.avatar_url
                    ? <img src={child.avatar_url} alt={child.name} className="h-full w-full object-cover" />
                    : child.name.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="text-center">
                <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{child.name}</div>
                <div className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {prog.done} / {prog.total} today
                </div>
              </div>
              {child.age != null && (
                <span
                  className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold"
                  style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                >
                  Age {child.age}
                </span>
              )}
            </div>
          )
        })}

        {/* Add child tile */}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex min-w-[132px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 transition-transform duration-150 hover:-translate-y-0.5"
          style={{ borderColor: 'color-mix(in srgb, var(--primary) 40%, transparent)', color: 'var(--text-secondary)' }}
          aria-label="Add child"
        >
          <div className="grid h-[50px] w-[50px] place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
            <Plus className="h-6 w-6" style={{ color: 'var(--primary)' }} />
          </div>
          <span className="text-sm font-semibold">Add child</span>
        </button>
      </div>

      <AddChildModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={() => { setIsAddOpen(false); onRefresh() }}
      />

      {editingChild && (
        <EditChildModal
          child={editingChild}
          open={!!editingChild}
          onOpenChange={(open) => !open && setEditingChild(null)}
          onSuccess={() => { setEditingChild(null); onRefresh() }}
        />
      )}
    </>
  )
}
