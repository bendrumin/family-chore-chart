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
      <Card className="overflow-hidden animate-bounce-in">
        <CardHeader style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-2xl font-bold"
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              👨‍👩‍👧‍👦 Children
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              variant="gradient"
              className="hover-glow"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Child
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
                className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 group hover-glow relative ${
                  selectedChildId === child.id
                    ? 'border-transparent shadow-2xl scale-105'
                    : 'border-white/30 hover:border-white/50 hover:shadow-xl hover:scale-102'
                }`}
                style={{
                  background: selectedChildId === child.id
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
                    : 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(10px)',
                  animationDelay: `${index * 0.1}s`
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
                  className={`absolute top-2 right-2 z-30 p-1.5 h-7 w-7 rounded-lg transition-all ${
                    selectedChildId === child.id
                      ? 'bg-white/90 hover:bg-white shadow-sm'
                      : 'opacity-0 group-hover:opacity-100 bg-white/70 hover:bg-white/90'
                  }`}
                  title="Edit child"
                >
                  <Edit3 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </Button>

                <div className="flex items-center gap-4 relative z-10 pointer-events-none">
                  {/* Avatar */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg ring-4 ring-white/50 transition-all duration-300 ${
                      selectedChildId === child.id ? 'scale-110 animate-float' : 'group-hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: child.avatar_color || '#6366f1',
                      background: child.avatar_color
                        ? `linear-gradient(135deg, ${child.avatar_color} 0%, ${child.avatar_color}dd 100%)`
                        : 'var(--gradient-primary)'
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
                      <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                        {child.name}
                      </h3>
                      {child.age && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap"
                          style={{
                            background: 'var(--gradient-success)',
                            color: 'white'
                          }}
                        >
                          {child.age} yrs
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {selectedChildId === child.id ? '✨ Currently viewing' : '👆 Click to view chores'}
                    </p>
                  </div>

                  {/* Active Badge */}
                  {selectedChildId === child.id && (
                    <div className="flex items-center flex-shrink-0">
                      <Badge
                        className="text-white font-bold shadow-lg whitespace-nowrap"
                        style={{
                          background: 'var(--gradient-success)',
                        }}
                      >
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
