'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit3 } from 'lucide-react'
import { AddChildModal } from './add-child-modal'
import { EditChildModal } from './edit-child-modal'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface ChildListProps {
  children: Child[]
  selectedChildId: string | null
  onSelectChild: (id: string) => void
  onRefresh: () => void
}

export function ChildList({ children, selectedChildId, onSelectChild, onRefresh }: ChildListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b pb-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              👨‍👩‍👧‍👦 Children
            </CardTitle>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1 font-medium px-3 py-2 rounded-lg text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {children.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-6xl mb-4 animate-float">👶</div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                No children yet!
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Click "Add Child" to get started
              </p>
            </div>
          ) : (
            children.map((child, index) => (
              <div
                key={child.id}
                className="w-full p-4 rounded-lg border transition-all duration-300 group relative"
                style={{
                  borderColor: selectedChildId === child.id ? 'var(--primary)' : 'hsl(var(--border))',
                  background: selectedChildId === child.id ? `color-mix(in srgb, var(--primary) 8%, var(--card-bg))` : 'var(--bg-secondary)',
                  boxShadow: selectedChildId === child.id ? '0 2px 8px rgba(99,102,241,0.15)' : undefined,
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <button
                  onClick={() => onSelectChild(child.id)}
                  className="absolute inset-0 w-full h-full cursor-pointer z-0"
                  aria-label={`Select ${child.name}`}
                />

                {/* Edit Button - Top Right Corner */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingChild(child)
                  }}
                  className={`absolute top-2 right-2 z-30 p-1.5 h-7 w-7 rounded-md transition-all border ${
                    selectedChildId === child.id
                      ? 'shadow-sm'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
                  aria-label={`Edit ${child.name}`}
                  title={`Edit ${child.name}`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </Button>

                <div className="flex items-center gap-3.5 relative z-10 pointer-events-none">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold overflow-hidden shadow-sm transition-all duration-300"
                    style={{
                      backgroundColor: child.avatar_color || '#6366f1',
                      background: child.avatar_color
                        ? `linear-gradient(135deg, ${child.avatar_color} 0%, ${child.avatar_color}dd 100%)`
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    }}
                  >
                    {child.avatar_url ? (
                      <img
                        src={child.avatar_url}
                        alt={child.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      child.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                        {child.name}
                      </h3>
                      {child.age && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 whitespace-nowrap">
                          {child.age} yrs
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {selectedChildId === child.id ? 'Currently viewing' : 'Click to view'}
                    </p>
                  </div>

                  {/* Active Badge */}
                  {selectedChildId === child.id && (
                    <div className="flex items-center flex-shrink-0">
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium shadow-sm whitespace-nowrap border border-blue-200 dark:border-blue-800">
                        Active
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AddChildModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => {
          setIsAddModalOpen(false)
          onRefresh()
        }}
      />

      {editingChild && (
        <EditChildModal
          child={editingChild}
          open={!!editingChild}
          onOpenChange={(open) => !open && setEditingChild(null)}
          onSuccess={() => {
            setEditingChild(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
