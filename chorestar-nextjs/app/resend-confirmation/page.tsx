'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ResendConfirmationPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        if (error.message.includes('rate limit')) {
          toast.error('Too many requests. Please wait a few minutes and try again.')
        } else if (error.message.includes('not found')) {
          toast.error('No account found with this email address.')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success('Confirmation email sent! Please check your inbox and spam folder.')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold" style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            <span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Resend Confirmation Email
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Didn't receive your confirmation email? We'll send you a new one.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleResend} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <Button
              type="submit"
              variant="gradient"
              className="w-full text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                'Sending...'
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Confirmation Email
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Make sure to check your spam folder if you don't see the email within a few minutes.
        </p>
      </div>
    </div>
  )
}
