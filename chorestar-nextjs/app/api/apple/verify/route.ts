import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { verifyTransaction } from '@/lib/apple/verifier'
import { decideEntitlement } from '@/lib/apple/entitlement'

/**
 * POST /api/apple/verify  { signedTransaction }
 *
 * The iOS app's way to confirm Premium after a purchase or restore, now that
 * the app can't write profiles.subscription_type itself (migration 024). It
 * sends StoreKit 2's signed transaction; the server verifies it with Apple's
 * certificates, checks it belongs to this account (decideEntitlement), and
 * saves the upgrade. Apple's server notifications stay the source of truth for
 * renewals and cancellations; this only ever upgrades, never downgrades.
 *
 * Returns { premium, saved, reason? }.
 */
export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let signedTransaction: unknown
  try {
    signedTransaction = (await request.json())?.signedTransaction
  } catch {
    // handled below
  }
  if (typeof signedTransaction !== 'string' || signedTransaction.split('.').length !== 3) {
    return NextResponse.json({ error: 'signedTransaction is required' }, { status: 400 })
  }

  let verified
  try {
    verified = await verifyTransaction(signedTransaction)
  } catch (err) {
    console.error('Apple verify: signature rejected', err)
    return NextResponse.json({ premium: false, saved: false, reason: 'unverified' }, { status: 400 })
  }

  // apple_original_transaction_id (migration 018) is not in the generated types.
  const admin = createServiceRoleClient() as any
  const originalTransactionId =
    verified.transaction.originalTransactionId != null ? String(verified.transaction.originalTransactionId) : null
  let claimedByUserId: string | null = null
  if (originalTransactionId) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('apple_original_transaction_id', originalTransactionId)
      .neq('id', userId)
      .limit(1)
      .maybeSingle()
    claimedByUserId = data?.id ?? null
  }

  const decision = decideEntitlement({ userId, ...verified, claimedByUserId })
  if (!decision.grant) {
    return NextResponse.json({ premium: false, saved: false, reason: decision.reason })
  }
  if (!decision.persist) {
    return NextResponse.json({ premium: true, saved: false, reason: 'sandbox' })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_type, apple_original_transaction_id')
    .eq('id', userId)
    .maybeSingle()
  const update: Record<string, string> = {}
  // Upgrade only: lifetime stays lifetime, and downgrades come from Apple's notifications.
  if (profile?.subscription_type === 'free') update.subscription_type = 'premium'
  if (!profile?.apple_original_transaction_id) update.apple_original_transaction_id = decision.originalTransactionId
  if (Object.keys(update).length) {
    const { error } = await admin.from('profiles').update(update).eq('id', userId)
    if (error) {
      console.error('Apple verify: profile update failed', error)
      return NextResponse.json({ error: 'Could not save the upgrade' }, { status: 500 })
    }
  }
  return NextResponse.json({ premium: true, saved: true })
}
