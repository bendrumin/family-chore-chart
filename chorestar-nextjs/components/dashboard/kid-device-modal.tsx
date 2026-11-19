'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { toast } from 'sonner'
import { Copy, Tablet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/**
 * Getting a kid onto their own device: the family code, a QR code that opens
 * /kid-login/<code> with it filled in, and the link to send. Opened by the
 * discovery tip `kid_device` (lib/engagement/discovery.ts) for families whose
 * kids have PINs but haven't signed in themselves lately.
 */
export function kidLoginUrl(familyCode: string, origin = 'https://chorestar.app'): string {
  return `${origin}/kid-login/${encodeURIComponent(familyCode)}`
}

export function KidDeviceModal({
  open,
  onOpenChange,
  familyCode,
  kidName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyCode: string | null
  /** The kid the tip is about; without one (Settings) it speaks to all the kids. */
  kidName?: string
}) {
  const [qr, setQr] = useState<string | null>(null)
  // The profile may predate the code: /api/kid-login-code creates it on first ask.
  const [fetchedCode, setFetchedCode] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const code = familyCode ?? fetchedCode
  const url = code ? kidLoginUrl(code, typeof window === 'undefined' ? undefined : window.location.origin) : null
  const whose = kidName ? `${kidName}\u2019s` : 'your kid\u2019s'

  useEffect(() => {
    if (!open || code) return
    let active = true
    fetch('/api/kid-login-code')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { code?: string }) => {
        if (!active) return
        if (data.code) setFetchedCode(data.code)
        else setLoadFailed(true)
      })
      .catch(() => active && setLoadFailed(true))
    return () => {
      active = false
    }
  }, [open, code])

  useEffect(() => {
    if (!open || !url) return
    let active = true
    // Dark modules on white, whatever the theme: phone cameras need the contrast.
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#111827', light: '#ffffff' } })
      .then((data) => active && setQr(data))
      .catch(() => active && setQr(null))
    return () => {
      active = false
    }
  }, [open, url])

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md max-h-[90vh] overflow-y-auto dialog-content-bg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <Tablet className="w-7 h-7" style={{ color: 'var(--primary)' }} aria-hidden />
            {kidName ? `${kidName}\u2019s own login` : 'Kids\u2019 own login'}
          </DialogTitle>
        </DialogHeader>

        {!code ? (
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {loadFailed ? 'Your family code couldn\u2019t load. Try again in a moment.' : 'Loading your family code\u2026'}
          </p>
        ) : (
          <div className="mt-4 space-y-4" data-testid="kid-device-modal">
            <ol className="space-y-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <li>1. On {whose} tablet or an old phone, scan this code or open the link.</li>
              <li>2. {kidName ?? 'Your kid'} taps their name and enters their PIN.</li>
              <li>3. That&apos;s it. Checked-off chores show up for you right away.</li>
            </ol>

            <div className="flex justify-center">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated data URL
                <img src={qr} alt={`QR code for ${whose} kid login`} width={200} height={200} className="rounded-xl border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-[200px] h-[200px] rounded-xl bg-gray-100 dark:bg-gray-800" aria-hidden />
              )}
            </div>

            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Family code</p>
              <p className="mt-1 text-3xl font-black tracking-[0.2em] text-gray-900 dark:text-white">{code.toUpperCase()}</p>
              <p className="mt-2 text-xs break-all text-gray-600 dark:text-gray-300">{url}</p>
            </div>

            <button
              type="button"
              onClick={() => void copy()}
              className="w-full min-h-[44px] rounded-xl font-bold accent-fill inline-flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" aria-hidden />
              Copy the link to send
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
