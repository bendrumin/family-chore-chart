'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Sparkles } from 'lucide-react'
import { BulkEditChoresModal } from '@/components/chores/bulk-edit-chores-modal'
import { AISuggestionsModal } from '@/components/help/ai-suggestions-modal'
import { useAuth } from '@/lib/hooks/use-auth'

export function ChoresTab() {
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
  const [isAISuggestionsOpen, setIsAISuggestionsOpen] = useState(false)
  const { user } = useAuth()

  return (
    <>
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✓</div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Chore Management
          </h3>
          <p className="text-base mb-6 text-gray-600 dark:text-gray-400">
            Manage chores for each child from the main dashboard
          </p>

          <div className="max-w-md mx-auto space-y-4">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
              <Edit2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
              <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Bulk Edit Chores</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Edit multiple chores at once - change categories, rewards, or delete in bulk
              </p>
              <Button
                variant="gradient"
                size="lg"
                onClick={() => setIsBulkEditOpen(true)}
                className="font-bold hover-glow w-full"
              >
                Open Bulk Editor
              </Button>
            </div>

            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all">
              <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
              <h4 className="font-bold mb-2 text-gray-900 dark:text-gray-100">AI Suggestions</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get AI-powered chore recommendations based on your family's habits (Coming Soon)
              </p>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsAISuggestionsOpen(true)}
                className="font-bold w-full"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {user && (
        <BulkEditChoresModal
          open={isBulkEditOpen}
          onOpenChange={setIsBulkEditOpen}
          onSuccess={() => setIsBulkEditOpen(false)}
          userId={user.id}
        />
      )}

      {/* AI Suggestions Modal */}
      <AISuggestionsModal
        open={isAISuggestionsOpen}
        onOpenChange={setIsAISuggestionsOpen}
      />
    </>
  )
}
