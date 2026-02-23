'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { validatePassword } from '@/lib/utils/validation'

export function SignupForm({ next = '/dashboard' }: { next?: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    familyName: '',
    password: '',
    confirmPassword: '',
  })
  const [honeypot, setHoneypot] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (honeypot) {
      toast.error('Invalid submission.')
      setIsLoading(false)
      return
    }

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all required fields')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    const passwordError = validatePassword(formData.password)
    if (passwordError) {
      toast.error(passwordError)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          familyName: formData.familyName.trim() || 'My Family',
          honeypot,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Signup failed. Please try again.')
        return
      }

      router.push(`/signup-success?email=${encodeURIComponent(formData.email)}`)
    } catch (error) {
      toast.error('An error occurred during signup')
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

      {/* Family Name */}
      <div className="space-y-2">
        <Label htmlFor="familyName">
          Family Name <span className="text-gray-400 text-xs font-normal">(optional)</span>
        </Label>
        <Input
          id="familyName"
          type="text"
          autoComplete="organization"
          value={formData.familyName}
          onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
          placeholder="e.g., The Smiths"
        />
        <p className="text-xs text-gray-500">This helps personalize your experience</p>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Minimum 8 characters with uppercase, lowercase, and number
        </p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          placeholder="••••••••"
        />
      </div>

      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      {/* Sign In Link */}
      <p className="text-center text-gray-600 dark:text-gray-300">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
          Sign in here
        </Link>
      </p>
    </form>
  )
}
