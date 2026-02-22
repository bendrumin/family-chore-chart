'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface InviteDetails {
  status: string
  familyName: string
  expired: boolean
}

export default function AcceptInvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    async function loadInvite() {
      try {
        // Check auth status via supabase client
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)

        // Load invite details
        const res = await fetch(`/api/family/invite/${code}`)
        if (!res.ok) {
          setError('This invite link is invalid or has expired.')
          return
        }
        const data = await res.json()
        setInvite(data)

        if (data.status === 'accepted') {
          setError('This invite has already been accepted.')
        } else if (data.expired || data.status === 'expired') {
          setError('This invite has expired. Ask the family owner to send a new invite.')
        }
      } catch {
        setError('Failed to load invite details.')
      } finally {
        setLoading(false)
      }
    }
    loadInvite()
  }, [code])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to join family.')
      } else {
        setAccepted(true)
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⭐</div>
          <p className="text-gray-600 font-medium">Loading invite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-center">
          <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-white">Family Invite</h1>
          <p className="text-indigo-200 text-sm mt-1">ChoreStar</p>
        </div>

        <div className="p-8">
          {accepted ? (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h2>
              <p className="text-gray-600">
                You've joined <strong>{invite?.familyName}</strong>'s family on ChoreStar. Redirecting to your dashboard...
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-5xl mb-4">😕</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Invite unavailable</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Link
                href="/dashboard"
                className="inline-block text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              >
                Go to Dashboard
              </Link>
            </div>
          ) : invite ? (
            <div className="text-center">
              <p className="text-gray-600 mb-2 text-sm">You've been invited to join</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{invite.familyName}</h2>
              <p className="text-gray-500 text-sm mb-8">
                on ChoreStar — where families manage chores and routines together.
              </p>

              {isLoggedIn ? (
                <div className="space-y-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full text-white py-3 rounded-lg font-semibold disabled:opacity-60 transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    {accepting ? 'Joining...' : '✓ Accept Invitation'}
                  </button>
                  <Link
                    href="/dashboard"
                    className="block w-full text-center text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
                  >
                    Decline
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-600 text-sm mb-4">
                    Sign in or create an account to accept this invitation.
                  </p>
                  <Link
                    href={`/login?next=/family/accept/${code}`}
                    className="block w-full text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all text-center"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    Sign In to Accept
                  </Link>
                  <Link
                    href={`/signup?next=/family/accept/${code}`}
                    className="block w-full border-2 border-indigo-600 text-indigo-600 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors text-center"
                  >
                    Create Free Account
                  </Link>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-6">
                This invite expires in 7 days
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
