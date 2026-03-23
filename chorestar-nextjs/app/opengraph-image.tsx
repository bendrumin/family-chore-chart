import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'ChoreStar — Chore Chart App & Allowance Tracker for Families'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.08,
          }}
        >
          {['⭐', '✨', '🌟', '✅', '🏆', '🎉', '💫', '⭐', '✨', '🌟', '✅', '🏆'].map(
            (emoji, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: '64px',
                  top: `${(i % 3) * 30 + 10}%`,
                  left: `${(i * 8.5) % 100}%`,
                }}
              >
                {emoji}
              </div>
            )
          )}
        </div>

        {/* Logo icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            borderRadius: '28px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            marginBottom: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          }}
        >
          <svg
            viewBox="0 0 64 64"
            width="80"
            height="80"
          >
            <path
              d="M32 12l5.2 13.5 14.3.4-11.3 8.3 4.4 13.7-12.6-7.6-12.6 7.6 4.4-13.7-11.3-8.3 14.3-.4L32 12z"
              fill="white"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: '16px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
            display: 'flex',
          }}
        >
          ChoreStar
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '700px',
            textAlign: 'center',
            lineHeight: 1.4,
            display: 'flex',
          }}
        >
          Turn chores into a game kids love
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '40px',
          }}
        >
          {['Kid-Friendly Login', 'Step-by-Step Routines', 'Earn Rewards'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  padding: '10px 24px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 600,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '20px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.6)',
            display: 'flex',
          }}
        >
          chorestar.app
        </div>
      </div>
    ),
    { ...size }
  )
}
