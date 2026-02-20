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
        className="max-w-lg dialog-content-bg shadow-2xl border-2 border-gray-200/80 dark:border-gray-600/50 overflow-hidden p-6"
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <span className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              <Sparkles className="w-5 h-5" />
            </span>
            Welcome to the New ChoreStar!
          </DialogTitle>
          <DialogDescription className="text-base pt-1" style={{ color: 'var(--text-secondary)' }}>
            We&apos;ve rebuilt ChoreStar to be faster, smoother, and more fun. Here are some highlights:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2 max-h-[45vh] overflow-y-auto pr-1 scrollbar-modern">
          <div className="p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-700/60 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
              <LogIn className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Kid Zone</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Each family has a <strong>unique kid login link</strong> (Settings → Family). Share that link with kids—they enter their 4–6 digit PIN and only see your family&apos;s routines. Set PINs per child in Settings → Edit Children.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-700/60 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-blue-500 text-white shadow-md">
              <ListTodo className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Visual Routines</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Step-by-step routines like &quot;Morning&quot; or &quot;Bedtime&quot; with checkboxes. Kids tap through each step, earn rewards, and build consistency.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border-2 border-green-200 dark:border-green-700/60 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 flex gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-green-500 text-white shadow-md">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>Everything You Love</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Chores, rewards, weekly stats, seasonal themes, and achievements—all in a cleaner, faster interface. <span className="font-medium">Premium:</span> printable charts, premium themes, export reports.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center font-medium mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Free plan: up to 3 kids and 20 chores. Upgrade anytime in Settings → Billing.
          </p>
          <Button onClick={handleClose} variant="gradient" className="w-full font-bold py-6 text-base shadow-lg hover:shadow-xl transition-all">
            Got it! ✨
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
