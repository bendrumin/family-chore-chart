'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, UserMinus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Member {
  user_id: string
  profiles: { email: string; family_name: string } | null
}

/**
 * Family sharing a free owner already has (set up while on Premium or a
 * trial): who's in, with Remove, and the join code with Turn off. Adding
 * people stays Premium, so there is no invite or new-code button here.
 * Renders nothing when there is nothing to manage.
 */
export function ExistingSharingList() {
  const [members, setMembers] = useState<Member[]>([])
  const [joinCode, setJoinCode] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/family/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch {
      // nothing to show
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('family_codes').select('code').eq('user_id', user.id).maybeSingle()
      setJoinCode(data?.code ?? null)
    } catch {
      // nothing to show
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const removeMember = async (userId: string) => {
    setBusy(userId)
    try {
      const res = await fetch('/api/family/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error()
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setBusy(null)
    }
  }

  const revokeCode = async () => {
    setBusy('code')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('family_codes').delete().eq('user_id', user.id)
      if (error) throw error
      setJoinCode(null)
      toast.success('Join code turned off')
    } catch {
      toast.error('Could not turn off the join code')
    } finally {
      setBusy(null)
    }
  }

  if (members.length === 0 && !joinCode) return null

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
      {members.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-400" aria-hidden />
            Sharing your family now
          </div>
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.user_id} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                  {m.profiles?.email || m.profiles?.family_name || 'Co-parent'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeMember(m.user_id)}
                  disabled={busy === m.user_id}
                  aria-label={`Remove ${m.profiles?.email || 'co-parent'}`}
                >
                  <UserMinus className="mr-1 h-4 w-4" aria-hidden />
                  {busy === m.user_id ? 'Removing...' : 'Remove'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {joinCode && (
        <div className="flex items-center gap-3">
          <KeyRound className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden />
          <span className="min-w-0 flex-1 text-sm text-gray-700 dark:text-gray-300">
            Join code <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{joinCode}</span> still works
          </span>
          <Button type="button" variant="outline" size="sm" onClick={revokeCode} disabled={busy === 'code'}>
            {busy === 'code' ? 'Turning off...' : 'Turn off'}
          </Button>
        </div>
      )}
    </div>
  )
}
