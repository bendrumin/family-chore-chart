/**
 * AI-powered chore suggestions (Claude Haiku 4.5).
 *
 * This is the real LLM path behind the "Smart Chore Suggestions" modal. It's
 * deliberately *not* call-heavy: one request returns the whole set of
 * suggestions as structured JSON, and the caller (the modal) only fires it on
 * an explicit user action, then caches the result in component state. The
 * request hits Anthropic — never Supabase — so it adds no database load.
 *
 * Model choice: Haiku 4.5 is the cheapest current Claude model ($1/$5 per 1M
 * tokens) and more than capable for "suggest 5 age-appropriate chores." A
 * refresh costs a fraction of a cent.
 *
 * Output is constrained with a JSON schema via `output_config.format`
 * (structured outputs), then re-validated with Zod client-side — so the model
 * must return the exact shape we validate against, no fragile string parsing.
 * If the key is missing or the call fails, this throws `AISuggestionsError`;
 * the API route turns that into a signal the client uses to fall back to the
 * local rule-based engine (`generateSuggestions`).
 */
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ChoreSuggestion, SuggestionRequest } from '../utils/chore-suggestions'

export const AI_MODEL = 'claude-haiku-4-5'

/** Categories the model may use — kept in sync with CATEGORY_LABELS. */
export const AI_CATEGORIES = [
  'self-care',
  'tidying',
  'kitchen',
  'laundry',
  'pets',
  'outdoor',
  'household',
  'learning',
] as const

/** Validates the parsed model output. Uses Zod for the runtime check only. */
const SuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      name: z.string(),
      category: z.enum(AI_CATEGORIES),
      icon: z.string(),
      rewardCents: z.number(),
      reason: z.string(),
    })
  ),
})

/**
 * JSON schema handed to the model via `output_config.format`. Kept as a plain
 * object (not derived from Zod) so it stays independent of the installed Zod
 * major version. Structured outputs require `additionalProperties: false` and
 * every property listed in `required`.
 */
const OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'category', 'icon', 'rewardCents', 'reason'],
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: [...AI_CATEGORIES] },
          icon: { type: 'string' },
          rewardCents: { type: 'integer' },
          reason: { type: 'string' },
        },
      },
    },
  },
}

/** Thrown when the AI path is unavailable; the caller should fall back locally. */
export class AISuggestionsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AISuggestionsError'
  }
}

export async function suggestChoresWithAI(
  req: SuggestionRequest,
  count = 5
): Promise<ChoreSuggestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    throw new AISuggestionsError('ANTHROPIC_API_KEY is not configured')
  }

  const client = new Anthropic({ apiKey })
  const age = req.childAge ?? 7
  const month = new Date().getMonth() + 1

  const system = [
    "You are a thoughtful parenting assistant inside ChoreStar, a kids' chore app.",
    'Suggest age-appropriate chores that build independence and good habits.',
    'Rules:',
    `- Suggest exactly ${count} chores.`,
    "- Every chore must be safe and realistic for the child's age.",
    '- Never suggest a chore the child already has (compare case-insensitively).',
    '- Vary the categories so the set feels balanced, not five of the same kind.',
    `- "category" must be exactly one of: ${AI_CATEGORIES.join(', ')}.`,
    '- "icon" must be a single emoji relevant to the chore.',
    '- "rewardCents" is a suggested reward in US cents — typically 5-50, higher for harder chores.',
    '- "reason" is one short, warm sentence (max ~12 words) on why it suits this child.',
  ].join('\n')

  const user = [
    `Child: ${req.childName || 'the child'}`,
    `Age: ${age}`,
    `Current month (1-12): ${month} — prefer seasonally relevant chores when it makes sense.`,
    `Recent completion rate: ${req.completionRate}% — if it is high (>75%), lean toward slightly more challenging chores.`,
    `Chores they already have: ${
      req.existingChoreNames.length ? req.existingChoreNames.join(', ') : '(none yet)'
    }`,
    '',
    `Suggest ${count} new chores.`,
  ].join('\n')

  let raw: unknown
  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }
    raw = JSON.parse(text)
  } catch (err) {
    throw new AISuggestionsError(
      `AI request failed: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const validated = SuggestionsSchema.safeParse(raw)
  if (!validated.success) {
    throw new AISuggestionsError('AI returned an unexpected shape')
  }

  // Defence in depth: drop duplicates the model missed, clamp rewards to a sane
  // range, and cap the list. The schema already guarantees the shape and a
  // valid category; this just keeps bad values from ever reaching the UI/DB.
  const existing = new Set(req.existingChoreNames.map((n) => n.toLowerCase().trim()))
  const cleaned: ChoreSuggestion[] = validated.data.suggestions
    .filter((s) => s.name.trim() && !existing.has(s.name.toLowerCase().trim()))
    .map((s) => ({
      name: s.name.trim().slice(0, 80),
      category: s.category,
      icon: s.icon.trim() || '⭐',
      rewardCents: Math.max(1, Math.min(500, Math.round(s.rewardCents))),
      reason: (s.reason.trim() || 'A good habit-building chore.').slice(0, 120),
    }))
    .slice(0, count)

  if (cleaned.length === 0) {
    throw new AISuggestionsError('AI returned no usable suggestions')
  }

  return cleaned
}
