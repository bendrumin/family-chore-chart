'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        // Check if it's an email confirmation error
        if (error.message.includes('Email not confirmed')) {
          toast.error('Please confirm your email address before logging in. Check your inbox for the confirmation link.')
        } else {
          toast.error(error.message)
        }
        return
      }

      // Check if user has confirmed email
      if (data.user && !data.user.email_confirmed_at) {
        toast.error('Please confirm your email address before logging in. Check your inbox for the confirmation link.')
        await supabase.auth.signOut()
        return
      }

      toast.success('Welcome back!', { duration: 2500 })
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
        />
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.rememberMe}
            onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Remember me
          </span>
        </label>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button type="submit" variant="gradient" className="w-full text-white" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      {/* Sign Up Link */}
      <p className="text-center text-gray-600 dark:text-gray-300">
        Don't have an account?{' '}
        <Link href="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
          Create one here
        </Link>
      </p>

      {/* Resend Confirmation Link */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Didn't receive your confirmation email?{' '}
        <Link href="/resend-confirmation" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
          Resend it
        </Link>
      </p>
    </form>
  )
}
