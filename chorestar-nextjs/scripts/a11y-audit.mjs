// WCAG 2.1 AA audit of the public pages in light and dark mode, via axe-core in Playwright.
//   npm run a11y                       -> audits http://localhost:3005 (start it with: npx next start -p 3005)
//   npm run a11y -- https://chorestar.app
// Exit code is the number of violation groups, so CI can gate on it.
import { chromium } from 'playwright'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const AXE = require.resolve('axe-core/axe.min.js')
const base = process.argv[2] || 'http://localhost:3005'
const routes = ['/', '/login', '/signup', '/forgot-password', '/kid-login', '/how-to', '/blog', '/blog/morning-routine-for-kids', '/compare', '/compare/skylight-alternative', '/support', '/partners', '/privacy', '/terms']
const browser = await chromium.launch()
let groups = 0
for (const route of routes) for (const mode of ['light', 'dark']) {
  const ctx = await browser.newContext({ colorScheme: mode, viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript((m) => { try { localStorage.setItem('chorestar-theme-mode', m) } catch {} }, mode)
  const page = await ctx.newPage()
  try {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45000 })
    await page.addScriptTag({ path: AXE })
    const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }))
    for (const v of res.violations) {
      groups++
      console.log(`${route} [${mode}] ${v.impact} ${v.id} x${v.nodes.length}`)
      for (const nd of v.nodes.slice(0, 4)) {
        const msg = (nd.any[0]?.message || nd.all[0]?.message || '').replace(/\s+/g, ' ')
        const m = msg.match(/contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+), font size: ([\d.]+pt)/)
        console.log(`    ${nd.target[0].slice(0, 90)} :: ${nd.html.replace(/\s+/g, ' ').slice(0, 90)}${m ? ` :: ${m[1]} ${m[2]} on ${m[3]} ${m[4]}` : ''}`)
      }
    }
  } catch (e) { console.log(`${route} [${mode}] ERROR ${e.message.slice(0, 80)}`) }
  await ctx.close()
}
await browser.close()
console.log(`\n${groups === 0 ? 'Clean.' : groups + ' violation group(s).'} ${routes.length} routes x 2 modes.`)
process.exit(groups)
