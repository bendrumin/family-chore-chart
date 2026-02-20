'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Mail, X, RefreshCw, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

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

export function FamilySharingModal({ open, onOpenChange }: FamilySharingModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

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
    if (open) loadMembers()
  }, [open, loadMembers])

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
          {/* Invite section */}
          <div className="p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Invite a Co-Parent or Guardian
              </h3>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              They'll get an email with a link to join your family. Once accepted, they'll have full access to manage children, chores, and routines.
            </p>
            <div className="flex gap-2">
              <Input
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
                          className="text-red-500 hover:text-red-700 disabled:opacity-40 p-1 rounded transition-colors"
                          title="Remove member"
                        >
                          <X className="w-4 h-4" />
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
                          className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40 p-1 rounded transition-colors"
                          title="Resend invite"
                        >
                          <RefreshCw className={`w-4 h-4 ${resendingId === invite.invited_email ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {members.length === 0 && pendingInvites.length === 0 && (
                <div className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No members yet. Invite someone to get started!
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
