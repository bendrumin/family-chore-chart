import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWeekStart } from '@/lib/utils/date-helpers'

/**
 * GET /display/<code> — today's chore chart as plain HTML.
 *
 * Deliberately a Route Handler rather than a page: an App Router page, even a
 * pure server component, still ships Next's client runtime (~102 kB before any
 * of our own code). This is for kitchen screens — smart fridges, wall tablets,
 * decade-old iPads — whose browsers cannot survive the real dashboard. Several
 * report "failed rendering" after it has been open a while.
 *
 * So: no React, no hydration, no client JavaScript, no web fonts, no timers.
 * The page renders once and then just sits there. It refreshes with a <meta>
 * tag, which every browser that has ever existed supports.
 *
 * The CSS is deliberately conservative — no CSS variables, no grid, no flexbox
 * `gap` (Chrome 84+), no color-mix (Chrome 111+, which the main app does use).
 * Layout is floats and margins so it survives a genuinely old engine.
 */

export const dynamic = 'force-dynamic'

/** Minutes between auto-refreshes. Long enough to be gentle on a weak device. */
const REFRESH_MINUTES = 5

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function page(title: string, body: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="${REFRESH_MINUTES * 60}">
<title>${esc(title)}</title>
<style>
  body { margin:0; padding:24px; background:#f3f4f6; color:#111827;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  h1 { margin:0 0 4px 0; font-size:40px; }
  .sub { color:#6b7280; font-size:20px; margin-bottom:24px; }
  .kid { background:#fff; border-radius:14px; padding:20px 24px; margin-bottom:18px;
         border:1px solid #e5e7eb; overflow:hidden; }
  .kidname { font-size:30px; font-weight:bold; margin:0; float:left; }
  .score { font-size:26px; color:#6b7280; float:right; margin-top:4px; }
  .clear { clear:both; }
  ul { list-style:none; margin:14px 0 0 0; padding:0; }
  li { font-size:24px; padding:10px 0; border-top:1px solid #f3f4f6; overflow:hidden; }
  .box { display:inline-block; width:26px; height:26px; border:3px solid #d1d5db;
         border-radius:6px; vertical-align:middle; margin-right:14px; text-align:center;
         line-height:26px; font-size:20px; color:#fff; }
  .done .box { background:#22c55e; border-color:#22c55e; }
  .done .name { color:#9ca3af; text-decoration:line-through; }
  .name { vertical-align:middle; }
  .foot { color:#9ca3af; font-size:16px; margin-top:20px; text-align:center; }
  .err { background:#fff; border-radius:14px; padding:28px; font-size:24px; }
</style>
</head><body>
${body}
</body></html>`
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Never let a proxy or the device pin a stale chart.
      'cache-control': 'no-store, max-age=0',
    },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  if (!/^[a-z0-9]{6,32}$/i.test(code)) {
    return page('ChoreStar', `<div class="err">That display link doesn't look right.</div>`)
  }

  try {
    const admin = createServiceRoleClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_code is newer than the generated types
    const { data: profile } = (await (admin as any)
      .from('profiles')
      .select('id, family_name')
      .eq('display_code', code)
      .maybeSingle()) as { data: { id: string; family_name: string | null } | null }

    if (!profile) {
      return page('ChoreStar', `<div class="err">This display link is no longer active. Generate a new one in ChoreStar under Settings &rarr; Family.</div>`)
    }

    const { data: children } = await admin
      .from('children')
      .select('id, name')
      .eq('user_id', profile.id)
      .order('name')

    const kids = children ?? []
    const choresByKid = new Map<string, { id: string; name: string }[]>()
    let doneIds = new Set<string>()

    if (kids.length) {
      const { data: chores } = await admin
        .from('chores')
        .select('id, name, child_id, sort_order')
        .in('child_id', kids.map((k) => k.id))
        .eq('is_active', true)
        .order('sort_order')

      for (const c of chores ?? []) {
        const list = choresByKid.get(c.child_id) ?? []
        list.push({ id: c.id, name: c.name })
        choresByKid.set(c.child_id, list)
      }

      const now = new Date()
      const weekStart = getWeekStart(new Date(now))
      const { data: completions } = await admin
        .from('chore_completions')
        .select('chore_id')
        .in('chore_id', (chores ?? []).map((c) => c.id))
        .eq('week_start', weekStart)
        .eq('day_of_week', now.getDay())

      doneIds = new Set((completions ?? []).map((c) => c.chore_id))
    }

    const dateLine = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })

    let body = `<h1>${esc(profile.family_name || 'Our Family')}</h1>\n<div class="sub">${esc(dateLine)}</div>\n`

    if (!kids.length) {
      body += `<div class="err">No children yet. Add one in the ChoreStar app and it will show up here.</div>`
    }

    for (const kid of kids) {
      const chores = choresByKid.get(kid.id) ?? []
      const done = chores.filter((c) => doneIds.has(c.id)).length
      body += `<div class="kid">\n  <p class="kidname">${esc(kid.name)}</p>\n`
      body += `  <div class="score">${done} / ${chores.length}</div>\n  <div class="clear"></div>\n`
      if (chores.length) {
        body += '  <ul>\n'
        for (const c of chores) {
          const isDone = doneIds.has(c.id)
          body += `    <li class="${isDone ? 'done' : ''}"><span class="box">${isDone ? '&#10003;' : ''}</span><span class="name">${esc(c.name)}</span></li>\n`
        }
        body += '  </ul>\n'
      } else {
        body += `  <ul><li style="border:0;color:#9ca3af">No chores today</li></ul>\n`
      }
      body += '</div>\n'
    }

    body += `<div class="foot">ChoreStar &middot; updates every ${REFRESH_MINUTES} minutes</div>`
    return page(profile.family_name || 'ChoreStar', body)
  } catch (error) {
    console.error('[display] failed to render:', error)
    // Still return a page, not a 500 — a kitchen screen showing a browser error
    // is worse than one showing a sentence.
    return page('ChoreStar', `<div class="err">Couldn't load the chart just now. It will try again shortly.</div>`)
  }
}
