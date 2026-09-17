// Ping IndexNow (Bing, Seznam, Yandex, and friends) so new or changed pages
// get crawled in hours, not weeks. Bing's index also feeds ChatGPT browsing,
// which is a signup channel we can see working in attribution, so run this
// after every deploy that adds or meaningfully changes a public page.
//
//   node scripts/indexnow.mjs                 # submit every sitemap URL
//   node scripts/indexnow.mjs /blog/foo /faq  # submit specific paths or URLs
//
// The key file is public/<key>.txt, deployed with the site. No account or
// secret involved: the key only proves we control the host, and Google does
// not support IndexNow (Search Console is the manual path there).

const HOST = 'chorestar.app'
// Deliberately public: the IndexNow protocol requires this exact value to be
// world-readable at https://chorestar.app/<key>.txt (it proves host control,
// nothing else), so it is not a secret. gitleaks:allow
const KEY = 'b854ffec9b833797263a86ae20dbe766' // gitleaks:allow

async function sitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap.xml`)
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

const args = process.argv.slice(2)
const urlList = args.length
  ? args.map((a) => (a.startsWith('http') ? a : `https://${HOST}${a.startsWith('/') ? a : `/${a}`}`))
  : await sitemapUrls()

if (urlList.length === 0) {
  console.error('nothing to submit')
  process.exit(1)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
})

console.log(`submitted ${urlList.length} urls -> ${res.status} ${res.statusText}`)
if (!res.ok && res.status !== 202) {
  console.error(await res.text())
  process.exit(1)
}
