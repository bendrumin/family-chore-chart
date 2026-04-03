import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <div style={{ fontSize: '96px', display: 'flex' }}>⭐</div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-2px',
            }}
          >
            ChoreStar
          </div>
          <div
            style={{
              fontSize: '32px',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: 500,
              maxWidth: '700px',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Make chores fun for kids — track tasks, earn rewards, build great habits
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          chorestar.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
