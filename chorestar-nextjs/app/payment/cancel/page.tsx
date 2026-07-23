'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react'
import { AmbientBackground } from '@/components/ui/ambient-background'

export default function PaymentCancelPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-bg)' }}>
      <AmbientBackground />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 max-w-lg w-full rounded-3xl border border-gray-200 dark:border-gray-700 p-8 text-center"
        style={{ background: 'var(--card-bg)', boxShadow: '0 1px 2px rgba(20,20,50,0.05), 0 22px 48px -20px rgba(70,60,140,0.4)' }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <XCircle className="w-14 h-14 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
          Payment Cancelled
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          No worries! Your payment was not processed and you have not been charged. You can upgrade anytime from your dashboard settings.
        </p>

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <CreditCard className="w-5 h-5" />
            Try Again
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
