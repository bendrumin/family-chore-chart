'use client'

import { useState } from 'react'
import { ChildAvatarContent } from '@/components/children/child-avatar-content'
import { Plus, Pencil } from 'lucide-react'
import { AddChildModal } from './add-child-modal'
import { EditChildModal } from './edit-child-modal'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface ChildSwitcherProps {
  children: Child[]
  selectedChildId: string | null
  onSelectChild: (id: string | null) => void
  onRefresh: () => void
  progress?: Record<string, { done: number; total: number }>
}

function Ring({ color, done, total }: { color: string; done: number; total: number }) {
  const R = 29
  const C = 2 * Math.PI * R
  const p = total > 0 ? done / total : 0
  return (
    <svg width="100%" height="100%" viewBox="0 0 66 66" style={{ transform: 'rotate(-90deg)' }}>
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
      {/* Phones: one horizontal, scrollable row of compact chips (the iOS
          avatar-ring switcher). sm+: the wrapping card grid, unchanged. */}
      <div className="flex flex-nowrap gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3.5 sm:overflow-visible sm:pb-0">
        {/* Everyone — family overview (iOS Home parity) */}
        <button
          type="button"
          onClick={() => onSelectChild(null)}
          aria-pressed={selectedChildId === null}
          aria-label="Show everyone"
          className="flex min-w-[86px] shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:min-w-[132px] sm:shrink sm:gap-2 sm:p-4"
          style={{
            background: 'var(--card-bg)',
            borderColor: selectedChildId === null
              ? 'color-mix(in srgb, var(--primary) 55%, transparent)'
              : 'hsl(var(--border))',
            boxShadow: selectedChildId === null
              ? '0 0 0 2px color-mix(in srgb, var(--primary) 32%, transparent), var(--shadow-md)'
              : 'var(--shadow-sm)',
          }}
        >
          <div
            className="grid h-[52px] w-[52px] place-items-center rounded-full text-xl font-black text-white sm:h-[66px] sm:w-[66px] sm:text-2xl"
            style={{ background: 'var(--gradient-primary)' }}
          >
            ⭐
          </div>
          <div className="text-center">
            <div className="text-sm font-bold sm:text-base" style={{ color: 'var(--text-primary)' }}>Everyone</div>
            <div className="hidden text-xs tabular-nums sm:block" style={{ color: 'var(--text-secondary)' }}>
              Family overview
            </div>
          </div>
        </button>

        {children.map((child) => {
          const color = child.avatar_color || '#6366f1'
          const prog = progress[child.id] || { done: 0, total: 0 }
          const isActive = selectedChildId === child.id
          return (
            <div key={child.id} className="group relative min-w-[86px] shrink-0 sm:min-w-[132px] sm:shrink">
              <button
                type="button"
                onClick={() => onSelectChild(child.id)}
                aria-pressed={isActive}
                aria-label={`Select ${child.name}`}
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-transform duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-2 sm:p-4"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: isActive ? `color-mix(in srgb, ${color} 55%, transparent)` : 'hsl(var(--border))',
                  boxShadow: isActive
                    ? `0 0 0 2px color-mix(in srgb, ${color} 32%, transparent), var(--shadow-md)`
                    : 'var(--shadow-sm)',
                }}
              >
                <div className="relative h-[52px] w-[52px] sm:h-[66px] sm:w-[66px]">
                  <Ring color={color} done={prog.done} total={prog.total} />
                  <div
                    className="absolute inset-[6px] grid place-items-center overflow-hidden rounded-full text-lg font-bold text-white sm:inset-[8px] sm:text-xl"
                    style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)` }}
                  >
                    <ChildAvatarContent child={child} name={child.name} />
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold sm:text-base" style={{ color: 'var(--text-primary)' }}>{child.name}</div>
                  <div className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    <span className="sm:hidden">{prog.done}/{prog.total}</span>
                    <span className="hidden sm:inline">{prog.done} / {prog.total} today</span>
                  </div>
                </div>
                {child.age != null && (
                  <span
                    className="hidden rounded-full px-2 py-0.5 text-[0.68rem] font-bold sm:inline-block"
                    style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
                  >
                    Age {child.age}
                  </span>
                )}
              </button>
              {/* Edit affordance — sibling of the select button (not nested inside it) */}
              <button
                type="button"
                onClick={() => setEditingChild(child)}
                aria-label={`Edit ${child.name}`}
                title={`Edit ${child.name}`}
                className="absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full opacity-100 transition-opacity sm:right-2 sm:top-2 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100"
                style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}

        {/* Add child tile */}
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex min-w-[86px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed p-2.5 transition-transform duration-150 hover:-translate-y-0.5 sm:min-w-[132px] sm:shrink sm:gap-2 sm:p-4"
          style={{ borderColor: 'color-mix(in srgb, var(--primary) 40%, transparent)', color: 'var(--text-secondary)' }}
          aria-label="Add child"
        >
          <div className="grid h-[40px] w-[40px] place-items-center rounded-full sm:h-[50px] sm:w-[50px]" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
            <Plus className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'var(--primary)' }} />
          </div>
          <span className="text-xs font-semibold sm:text-sm">Add child</span>
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
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}
