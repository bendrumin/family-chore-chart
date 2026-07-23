'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
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
    <AuthShell
      title="Resend confirmation email"
      subtitle="Didn't receive your confirmation email? We'll send you a new one."
      footer={<>Make sure to check your spam folder if you don't see the email within a few minutes.</>}
    >
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

          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
    </AuthShell>
  )
}
