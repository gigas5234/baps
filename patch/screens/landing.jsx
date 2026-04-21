// BAPS Landing — recreated from src/components/home/home-landing.tsx
// Faithful reproduction of hero video area, HUD overlay, pitch card, CTA bar.

function BapsLandingScreen() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#0f172a', color: '#f8fafc', overflow: 'hidden',
      fontFamily: '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
    }}>
      {/* Hero area with faux video bg */}
      <div style={{ position: 'relative', width: '100%', height: '64%' }}>
        {/* Faux video — noisy dark indigo gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 30% 40%, rgba(99,102,241,0.45), transparent 60%),
            radial-gradient(ellipse 60% 40% at 70% 70%, rgba(45,212,191,0.25), transparent 55%),
            linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)
          `,
        }} />
        {/* Food-ish silhouette */}
        <div style={{
          position: 'absolute', left: '50%', top: '58%', transform: 'translate(-50%,-50%)',
          width: 180, height: 180, borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, rgba(234,88,12,0.5), rgba(15,23,42,0.1) 70%)',
          filter: 'blur(8px)', opacity: 0.8,
        }} />
        {/* Scrim gradients (matches home-landing) */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.4) 0%, rgba(0,0,0,0.25) 40%, rgba(15,23,42,1) 100%)' }} />

        {/* HUD overlay (replicates LandingHeroHud) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.88 }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hs" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.55"/>
              <stop offset="45%" stopColor="#818cf8" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.4"/>
            </linearGradient>
          </defs>
          <g stroke="url(#hs)" fill="none" strokeWidth="0.09" vectorEffect="non-scaling-stroke" opacity="0.85">
            <path d="M6 22 L94 22"/><path d="M6 38 L78 38"/><path d="M14 54 L94 54"/>
            <path d="M6 70 L88 70"/><path d="M6 86 L72 86"/>
            <path d="M18 8 L18 94"/><path d="M52 6 L52 62"/><path d="M84 14 L84 92"/>
          </g>
          <g stroke="#2dd4bf" fill="none" strokeWidth="0.11" vectorEffect="non-scaling-stroke" opacity="0.45">
            <path d="M8 12 L8 20 L16 20"/><path d="M92 12 L92 20 L84 20"/>
            <path d="M8 88 L8 80 L16 80"/><path d="M92 88 L92 80 L84 80"/>
          </g>
          {[[6,22],[94,22],[78,38],[94,54],[88,70],[18,8],[52,62],[84,92]].map(([cx,cy],i)=>(
            <g key={i}>
              <circle cx={cx} cy={cy} r="0.38" fill="#2dd4bf" opacity="0.9"/>
              <circle cx={cx} cy={cy} r="0.85" fill="none" stroke="#818cf8" strokeWidth="0.06" vectorEffect="non-scaling-stroke" opacity="0.35"/>
            </g>
          ))}
        </svg>

        {/* Scan beam */}
        <div style={{
          position: 'absolute', left: '18%', right: '18%', top: '30%', height: '14%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(129,140,248,0.55) 45%, rgba(94,234,212,0.5) 55%, transparent 100%)',
          boxShadow: '0 0 12px rgba(94,234,212,0.4)', opacity: 0.8, pointerEvents: 'none',
        }} />

        {/* BAPS wordmark */}
        <div style={{ position: 'absolute', top: 48, left: 0, right: 0, textAlign: 'center' }}>
          <h1 style={{
            margin: 0,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 56, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
            color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.55)',
          }}>BAPS</h1>
        </div>
      </div>

      {/* Pitch card (overlaps hero) */}
      <div style={{ position: 'relative', marginTop: -64, padding: '0 20px' }}>
        <div style={{
          maxWidth: 512, margin: '0 auto',
          borderRadius: 16, padding: '24px 20px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.65)', color: '#fff',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}>
          <p style={{
            margin: 0,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: '#2dd4bf',
          }}>BAPS</p>
          <h2 style={{
            margin: '12px 0 0',
            fontSize: 26, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em',
          }}>
            사진 한 장으로 완성하는<br/>완벽한 식단 기록
          </h2>
          <p style={{
            margin: '12px 0 0', fontSize: 15, lineHeight: 1.55, color: 'rgba(255,255,255,0.85)',
          }}>
            찰칵 한 번이면 AI가 칼로리·영양소를 즉시 분석해요. 매일 밤 11시, 오늘의 식단에 대한 팩트 한 줄도 받아보세요.
          </p>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ padding: '16px 20px 20px', maxWidth: 512, margin: '0 auto' }}>
          {/* Google sign-in button */}
          <button style={{
            width: '100%', height: 56, border: 'none', cursor: 'pointer',
            borderRadius: 12, background: '#fff', color: '#1f1f1f',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path fill="#4285F4" d="M19.6 10.23c0-.72-.06-1.41-.18-2.07H10v3.92h5.39c-.23 1.25-.94 2.31-2.01 3.02v2.5h3.25c1.9-1.75 3-4.33 3-7.37z"/>
              <path fill="#34A853" d="M10 20c2.7 0 4.97-.9 6.63-2.4l-3.25-2.5c-.9.6-2.05.95-3.38.95-2.6 0-4.8-1.75-5.59-4.1H1.05v2.58C2.7 17.75 6.1 20 10 20z"/>
              <path fill="#FBBC05" d="M4.41 11.95c-.2-.6-.31-1.24-.31-1.95s.11-1.35.31-1.95V5.47H1.05A9.99 9.99 0 000 10c0 1.61.39 3.14 1.05 4.53l3.36-2.58z"/>
              <path fill="#EA4335" d="M10 3.96c1.47 0 2.78.5 3.81 1.5l2.86-2.86C14.97.99 12.7 0 10 0 6.1 0 2.7 2.25 1.05 5.47l3.36 2.58C5.2 5.71 7.4 3.96 10 3.96z"/>
            </svg>
            Google로 계속하기
          </button>
        </div>
      </div>
    </div>
  );
}

window.BapsLandingScreen = BapsLandingScreen;
