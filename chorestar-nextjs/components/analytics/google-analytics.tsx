'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-746ST4RH2E'

export function GoogleAnalytics() {
  const pathname = usePathname()
  const initialMount = useRef(true)

  // Track page views on route change (SPA client-side navigation)
  // Skip first run - gtag config already sends initial page view
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    if (typeof window !== 'undefined' && pathname && (window as any).gtag) {
      ;(window as any).gtag('event', 'page_view', {
        page_path: pathname,
        page_title: document.title,
      })
    }
  }, [pathname])

  // Track React/Next.js version on initial load
  useEffect(() => {
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
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}
