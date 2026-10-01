'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Asked once, right after a first Apple or Google sign-in. Those providers
 * give us "Jane Doe" or a relay-email prefix, not a family name, so
 * /auth/callback flags the dashboard with ?welcome=name-family and this asks
 * for a real one. Skipping keeps the guess; it can be changed in Settings.
 */
export function NameFamilyDialog({
  open,
  userId,
  currentName,
  onDone,
}: {
  open: boolean
  userId: string
  currentName: string
  onDone: (saved: boolean) => void
}) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim().slice(0, 100)
    if (!trimmed) return onDone(false)
    setIsSaving(true)
    const { error } = await createClient().from('profiles').update({ family_name: trimmed }).eq('id', userId)
    setIsSaving(false)
    if (error) {
      toast.error('Could not save your family name. You can set it later in Settings.')
      return onDone(false)
    }
    toast.success(`Welcome, ${trimmed}!`)
    onDone(true)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDone(false)}>
      <DialogContent>
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle>What should we call your family?</DialogTitle>
            <DialogDescription>
              Your kids see this when they log in. You can change it any time in Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="family-name">Family name</Label>
            <Input
              id="family-name"
              autoFocus
              autoComplete="organization"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentName ? `e.g. The ${currentName.split(' ').pop()}s` : 'e.g. The Smiths'}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onDone(false)} disabled={isSaving}>
              Skip for now
            </Button>
            <Button type="submit" variant="gradient" className="text-white" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
