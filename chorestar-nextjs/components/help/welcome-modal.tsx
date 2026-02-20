'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Users, ListTodo, LogIn } from 'lucide-react'

const WELCOME_KEY = 'chorestar_welcome_v2_seen'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(WELCOME_KEY)
    if (!seen) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(WELCOME_KEY, 'true')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        onClose={handleClose}
        className="max-w-lg dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Welcome to the New ChoreStar!
          </DialogTitle>
          <DialogDescription className="text-base pt-2" style={{ color: 'var(--text-secondary)' }}>
            We&apos;ve rebuilt ChoreStar to be faster, smoother, and more fun. Here are some highlights:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="p-4 rounded-xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 flex gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Kid Zone</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Each family has a <strong>unique kid login link</strong> (Settings → Family). Share that link with kids—they enter their 4–6 digit PIN and only see your family&apos;s routines, not anyone else&apos;s. Set PINs per child in Settings → Edit Children.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 flex gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-500 text-white">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Visual Routines</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Step-by-step routines like &quot;Morning&quot; or &quot;Bedtime&quot; with checkboxes. Kids tap through each step, earn rewards, and build consistency.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border-2 border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 flex gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-green-500 text-white">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Everything You Love</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Chores, rewards, weekly stats, seasonal themes, and achievements—all in a cleaner, faster interface. Printable charts, premium themes, and export reports are available with Premium.
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
          Free plan: up to 3 kids and 20 chores. Upgrade anytime in Settings → Billing.
        </p>

        <div className="flex justify-end pt-4">
          <Button onClick={handleClose} variant="gradient" className="font-bold">
            Got it! ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
