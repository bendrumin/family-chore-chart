'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Mail, X, RefreshCw, UserPlus, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Member {
  user_id: string
  created_at: string
  profiles: {
    email: string
    family_name: string
  }
}

interface PendingInvite {
  id: string
  invited_email: string
  created_at: string
  expires_at: string
}

interface FamilySharingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function randomJoinCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export function FamilySharingModal({ open, onOpenChange }: FamilySharingModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [joinInput, setJoinInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const loadJoinCode = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Not in generated types — same pattern as other admin tables.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('family_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle()
      setJoinCode(data?.code ?? null)
    } catch {
      // ignore
    }
  }, [])

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/family/members')
      if (!res.ok) return
      const data = await res.json()
      setMembers(data.members || [])
      setPendingInvites(data.pendingInvites || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadMembers()
      loadJoinCode()
    }
  }, [open, loadMembers, loadJoinCode])

  const handleGenerateJoinCode = async () => {
    setIsGeneratingCode(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      if (joinCode) return

      const code = randomJoinCode()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('family_codes').insert({
        user_id: user.id,
        code,
      })
      if (error) throw error
      setJoinCode(code)
      toast.success('Join code created')
    } catch (e: unknown) {
      console.error(e)
      toast.error('Could not create join code')
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const handleCopyJoinCode = async () => {
    if (!joinCode) return
    try {
      await navigator.clipboard.writeText(joinCode)
      toast.success('Code copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  const handleJoinWithCode = async () => {
    const code = joinInput.trim().toLowerCase()
    if (!code) return
    setIsJoining(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row, error: lookupError } = await (supabase as any)
        .from('family_codes')
        .select('user_id')
        .eq('code', code)
        .maybeSingle()
      if (lookupError || !row?.user_id) {
        toast.error('Code not found')
        return
      }
      if (row.user_id === user.id) {
        toast.error("That's your own family code")
        return
      }

      const { error: joinError } = await supabase.from('family_members').insert({
        user_id: user.id,
        family_id: row.user_id,
      })
      if (joinError) {
        if (joinError.code === '23505') toast.error('You already joined a family')
        else toast.error(joinError.message || 'Could not join')
        return
      }
      toast.success('Joined family!')
      setJoinInput('')
      onOpenChange(false)
      window.location.reload()
    } catch (e: unknown) {
      console.error(e)
      toast.error('Could not join family')
    } finally {
      setIsJoining(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return
    setIsSending(true)
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite')
      } else {
        toast.success(`Invite sent to ${inviteEmail.trim()}!`)
        setInviteEmail('')
        loadMembers()
      }
    } catch {
      toast.error('Failed to send invite')
    } finally {
      setIsSending(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setRemovingId(userId)
    try {
      const res = await fetch('/api/family/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        toast.error('Failed to remove member')
      } else {
        toast.success('Member removed')
        setMembers(prev => prev.filter(m => m.user_id !== userId))
      }
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemovingId(null)
    }
  }

  const handleResendInvite = async (email: string) => {
    setResendingId(email)
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to resend invite')
      } else {
        toast.success(`Invite resent to ${email}`)
        loadMembers()
      }
    } catch {
      toast.error('Failed to resend invite')
    } finally {
      setResendingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-lg dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Users className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            Family Sharing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* App join code — same family_codes table as iOS */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                App join code
              </h3>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Same code the iPhone app uses. Share it so a co-parent can join from Settings → Family Sharing on iOS or below on the web.
            </p>
            {joinCode ? (
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 font-mono text-lg font-bold tracking-wider"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {joinCode}
                </code>
                <Button variant="outline" onClick={handleCopyJoinCode} className="shrink-0">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            ) : (
              <Button
                variant="gradient"
                onClick={handleGenerateJoinCode}
                disabled={isGeneratingCode}
                className="font-bold hover-glow"
              >
                {isGeneratingCode ? 'Creating…' : 'Create join code'}
              </Button>
            )}
          </div>

          {/* Email invite */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Invite by email
              </h3>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              They&apos;ll get an email with a link to join your family. Once accepted, they&apos;ll have full access to manage children, chores, and routines.
            </p>
            <div className="flex gap-2">
              <label htmlFor="invite-email" className="sr-only">Email address to invite</label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter email address"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                className="flex-1"
              />
              <Button
                variant="gradient"
                onClick={handleSendInvite}
                disabled={isSending || !inviteEmail.trim()}
                className="font-bold hover-glow shrink-0"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Invite'}
              </Button>
            </div>
          </div>

          {/* Join someone else's family by app code */}
          <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
            <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
              Join a family with a code
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Got a code from your partner&apos;s phone or website? Enter it here.
            </p>
            <div className="flex gap-2">
              <Input
                value={joinInput}
                onChange={e => setJoinInput(e.target.value.toLowerCase())}
                placeholder="abcdefgh"
                className="flex-1 font-mono"
                maxLength={12}
              />
              <Button
                variant="outline"
                onClick={handleJoinWithCode}
                disabled={isJoining || !joinInput.trim()}
              >
                {isJoining ? 'Joining…' : 'Join'}
              </Button>
            </div>
          </div>

          {/* Current members */}
          {isLoading ? (
            <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading...
            </div>
          ) : (
            <>
              {members.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Users className="w-4 h-4" />
                    Family Members ({members.length})
                  </h3>
                  <div className="space-y-2">
                    {members.map(member => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {member.profiles?.family_name || 'Family Member'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {member.profiles?.email}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingId === member.user_id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-40 p-2 rounded transition-colors"
                          aria-label={`Remove ${member.profiles?.email || 'member'} from family`}
                          title="Remove member"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
                    Pending Invites ({pendingInvites.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingInvites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                      >
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {invite.invited_email}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleResendInvite(invite.invited_email)}
                          disabled={resendingId === invite.invited_email}
                          className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40 p-2 rounded transition-colors"
                          aria-label={`Resend invite to ${invite.invited_email}`}
                          title="Resend invite"
                        >
                          <RefreshCw className={`w-4 h-4 ${resendingId === invite.invited_email ? 'animate-spin' : ''}`} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {members.length === 0 && pendingInvites.length === 0 && (
                <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No members yet. Share a join code or send an email invite.
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
