'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Keyboard, X } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Quick Actions' },
  { keys: ['⌘', 'N'], description: 'Add Child' },
  { keys: ['⌘', '⇧', 'N'], description: 'Add Chore' },
  { keys: ['⌘', 'Z'], description: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], description: 'Redo' },
  { keys: ['Esc'], description: 'Close Modal' },
  { keys: ['?'], description: 'Toggle Shortcuts' },
  { keys: ['⌘', 'S'], description: 'Settings' },
  { keys: ['⌘', 'H'], description: 'Help Center' },
  { keys: ['⌘', 'F'], description: 'Send Feedback' },
  { keys: ['⌘', 'P'], description: 'Print' },
]

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle standalone ? key (without mod)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const activeElement = document.activeElement
        if (
          !activeElement ||
          (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')
        ) {
          e.preventDefault()
          onOpenChange(!open)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">?</kbd> anywhere to
            open this menu
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex gap-1 flex-shrink-0">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm font-mono font-semibold shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Tip: These shortcuts work anywhere in the app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
