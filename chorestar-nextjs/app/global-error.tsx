'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  const isDark = typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-color-scheme: dark)').matches ||
      (() => { const h = new Date().getHours(); return h >= 19 || h < 7 })());

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: isDark
            ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
            : 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            background: isDark ? '#1f2937' : 'white',
            borderRadius: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💥</div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: isDark ? '#f9fafb' : '#111827',
              marginBottom: '0.5rem'
            }}>
              Critical Error
            </h1>

            <p style={{
              color: isDark ? '#9ca3af' : '#6b7280',
              marginBottom: '1.5rem'
            }}>
              We encountered a critical error. Please refresh the page or try again later.
            </p>

            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                marginBottom: '0.75rem'
              }}
            >
              Refresh Page
            </button>

            <a
              href="/"
              style={{
                display: 'block',
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: isDark ? '#374151' : '#f3f4f6',
                color: isDark ? '#e5e7eb' : '#374151',
                fontWeight: '600',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '1rem'
              }}
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
