'use client'

import { useState } from 'react'
import { ChildAvatarContent } from '@/components/children/child-avatar-content'
import { Plus, Pencil, Users } from 'lucide-react'
import { AddChildModal } from './add-child-modal'
import { EditChildModal } from './edit-child-modal'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface ChildSwitcherProps {
  children: Child[]
  selectedChildId: string | null
  onSelectChild: (id: string | null) => void
  onRefresh: () => void
}

export function ChildSwitcher({ children, selectedChildId, onSelectChild, onRefresh }: ChildSwitcherProps) {
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
            className="grid h-[52px] w-[52px] place-items-center rounded-full text-white sm:h-[66px] sm:w-[66px]"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Users className="h-6 w-6 text-white sm:h-7 sm:w-7" />
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
                {/* Progress moved up into the hero's per-kid rings; the chip
                    is identity + selection only. */}
                <div
                  className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full text-lg font-bold text-white sm:h-[66px] sm:w-[66px] sm:text-xl"
                  style={{ background: `linear-gradient(180deg, ${color} 0%, ${color}dd 100%)` }}
                >
                  <ChildAvatarContent child={child} name={child.name} />
                </div>

                <div className="text-center">
                  <div className="text-sm font-bold sm:text-base" style={{ color: 'var(--text-primary)' }}>{child.name}</div>
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
