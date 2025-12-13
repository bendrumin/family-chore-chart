'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface AISuggestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AISuggestionsModal({ open, onOpenChange }: AISuggestionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            AI-Powered Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Coming Soon Message */}
          <div className="p-8 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Coming Soon!
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              We're working on AI-powered suggestions that will help you:
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              <li>✨ Get personalized chore recommendations based on your family's habits</li>
              <li>📊 Analyze completion patterns and suggest optimal reward amounts</li>
              <li>🎯 Recommend new activities based on your children's interests</li>
              <li>📈 Provide insights on how to improve engagement and consistency</li>
              <li>🎨 Suggest seasonal activities tailored to your location and preferences</li>
            </ul>
            <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
              This feature will be available in a future update!
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              variant="gradient"
              size="lg"
              onClick={() => onOpenChange(false)}
              className="font-bold hover-glow"
            >
              Got it! 👍
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

