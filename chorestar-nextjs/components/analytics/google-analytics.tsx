'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export function GoogleAnalytics() {
  useEffect(() => {
    // Track that user is on React/Next.js version on page load
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'version_usage', {
        version: 'react_nextjs',
        action: 'page_view',
      })
    }
  }, [])

  return (
    <>
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-746ST4RH2E"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-746ST4RH2E', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}
