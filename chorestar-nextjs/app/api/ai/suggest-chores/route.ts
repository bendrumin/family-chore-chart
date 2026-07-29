import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  recordAttempt,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/utils/rate-limit'
import { suggestChoresWithAI, AISuggestionsError } from '@/lib/ai/suggest-chores'

const RequestSchema = z.object({
  childName: z.string().max(80).optional().default(''),
  childAge: z.number().int().min(1).max(18).nullable().optional().default(null),
  existingChoreNames: z.array(z.string().max(120)).max(100).optional().default([]),
  completionRate: z.number().min(0).max(100).optional().default(0),
})

export async function POST(request: Request) {
  try {
    // Require an authenticated parent. Kids never hit this endpoint, and gating
    // on a real session stops anonymous callers from burning Anthropic tokens.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Per-user rate limit — a hard ceiling on token spend even if the UI misbehaves.
    const rate = await checkRateLimit(`ai-suggest:${user.id}`, RATE_LIMITS.AI_SUGGESTIONS)
    if (!rate.allowed) {
      return createRateLimitResponse(
        rate.retryAfter || 60,
        'Too many suggestion requests. Please wait a moment and try again.'
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    await recordAttempt(`ai-suggest:${user.id}`, RATE_LIMITS.AI_SUGGESTIONS)

    const suggestions = await suggestChoresWithAI(parsed.data)
    return NextResponse.json({ suggestions })
  } catch (error) {
    if (error instanceof AISuggestionsError) {
      // Missing key or upstream failure. 503 is the client's cue to fall back to
      // the local rule-based engine — the feature degrades, it doesn't break.
      console.warn('AI suggestions unavailable:', error.message)
      return NextResponse.json({ error: 'ai_unavailable' }, { status: 503 })
    }
    console.error('AI suggestions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
