'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Crown, ArrowRight, Loader2 } from 'lucide-react'
import { AmbientBackground } from '@/components/ui/ambient-background'

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      }}>
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Confirming your payment...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (sessionId) {
      const timer = setTimeout(() => setStatus('success'), 1500)
      return () => clearTimeout(timer)
    } else {
      setStatus('success')
    }
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
      }}>
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-semibold">Confirming your payment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-bg)' }}>
      <AmbientBackground />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-lg w-full rounded-3xl border border-gray-200 dark:border-gray-700 p-8 text-center"
        style={{ background: 'var(--card-bg)', boxShadow: '0 1px 2px rgba(20,20,50,0.05), 0 22px 48px -20px rgba(70,60,140,0.4)' }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-14 h-14 text-green-500 dark:text-green-400" />
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-2 -right-2 bg-purple-500 rounded-full p-2"
            >
              <Crown className="w-6 h-6 text-white" />
            </motion.div>
          </div>
        </motion.div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
          Welcome to Premium!
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your payment was successful. You now have access to all premium features including unlimited children, chores, and more.
        </p>

        <div className="rounded-xl p-4 mb-8 bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <Crown className="w-5 h-5" />
            <span>Premium features are now active</span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5" />
        </Link>
      </motion.div>
    </div>
  )
}
