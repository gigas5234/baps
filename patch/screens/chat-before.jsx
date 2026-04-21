// BAPS Chat — Before (current design recreation, for A/B comparison)
// 카카오톡 모방 스타일: 아바타·이름·꼬리 말풍선 + 3블록 세로 나열

function ChatBeforeMobile() {
  const T = window.ChatTokens;
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: '#faf9f7', color: T.ink,
      fontFamily: T.font, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <button style={{ width: 32, height: 32, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke={T.inkMuted} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>BAPS 코치</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['🚨','🥗','🏃','🧠','📊'].map((e, i) => (
            <div key={i} style={{
              width: 28, height: 28, borderRadius: 8,
              background: i === 0 ? 'rgba(244,63,94,0.12)' : 'rgba(15,23,42,0.04)',
              border: i === 0 ? '1px solid rgba(244,63,94,0.3)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
            }}>{e}</div>
          ))}
        </div>
      </div>

      {/* Atrium coach picker — cramped 5 tiles */}
      <div style={{ padding: '10px 12px 6px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {window.CoachData.map((c, i) => (
          <div key={c.id} style={{
            flexShrink: 0, minWidth: 68, padding: '8px 4px',
            borderRadius: 12, background: i === 0 ? 'rgba(201,100,66,0.12)' : '#fff',
            border: i === 0 ? '1px solid rgba(201,100,66,0.4)' : `1px solid ${T.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 2 }}>{c.emoji}</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 7, color: T.inkMuted, lineHeight: 1.2, marginTop: 1 }}>
              {c.tagline.slice(0, 9)}…
            </div>
          </div>
        ))}
      </div>

      {/* Thread — kakao-ish bubbles, 3-block vertical */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 10px' }}>
        <KakaoUser text="오늘 점심 뭐 먹지"/>
        <KakaoCoach tag="전술 요약" emoji="📋" text="오늘 점심까진 탄수 62%·단백질 18%. 단백질 결핍으로 근 이화 진행 중." bubble="#fff"/>
        <KakaoCoach tag="다이어트 코치" emoji="🚨" text="또 덮밥이야? 패턴 포착 — 주 3회 탄수 과부하 확정." bubble="#fff" italic/>
        <KakaoCoach tag="미션" emoji="🎯" text="닭가슴살 120g + 현미밥 ½ + 나물 2종으로 교체 명령." bubble="#fef3c7"/>
      </div>

      {/* Quick chips panel — boxed */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, background: '#fff' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.inkMuted, letterSpacing: '0.08em', marginBottom: 6 }}>
          📋 빠른 요청
        </div>
        {['오늘 식단 평가','남은 칼로리','저녁 추천'].map(c => (
          <button key={c} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '7px 10px', marginBottom: 4,
            borderRadius: 8, border: `1px solid ${T.border}`, borderLeft: '2px solid #b4233b',
            background: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            fontFamily: T.font, color: T.ink,
          }}>• {c}</button>
        ))}
      </div>

      {/* Composer */}
      <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${T.border}`, background: '#fff', display: 'flex', gap: 6 }}>
        <input placeholder="메시지 입력" style={{
          flex: 1, padding: '8px 12px', border: `1px solid ${T.border}`,
          borderRadius: 20, fontSize: 12, fontFamily: T.font, outline: 'none',
        }}/>
        <button style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: T.surfaceMuted, cursor: 'pointer' }}>🎤</button>
        <button style={{ width: 36, height: 36, borderRadius: 18, border: 'none', background: '#c96442', color: '#fff', cursor: 'pointer' }}>→</button>
      </div>
    </div>
  );
}

function KakaoUser({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 4, alignItems: 'flex-end' }}>
      <span style={{ fontSize: 9, color: 'rgba(15,23,42,0.45)' }}>14:32</span>
      <div style={{
        maxWidth: '70%', padding: '7px 11px',
        background: '#FEE500', color: '#3C1E1E',
        borderRadius: '16px 4px 16px 16px',
        fontSize: 12, lineHeight: 1.4,
      }}>{text}</div>
    </div>
  );
}

function KakaoCoach({ tag, emoji, text, bubble, italic }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, #be123c, #7f1d1d)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        boxShadow: '0 0 0 2px rgba(99,102,241,0.4)',
        flexShrink: 0,
      }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(15,23,42,0.55)', marginBottom: 2, paddingLeft: 2 }}>{tag}</div>
        <div style={{
          maxWidth: '85%', padding: '7px 10px',
          background: bubble, border: `1px solid rgba(15,23,42,0.08)`,
          borderRadius: 12, borderTopLeftRadius: 4,
          position: 'relative', fontSize: 12, lineHeight: 1.4,
          fontStyle: italic ? 'italic' : 'normal',
          color: '#0f172a',
        }}>
          {/* tail */}
          <div style={{
            position: 'absolute', left: -6, top: 9,
            width: 0, height: 0,
            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
            borderRight: `7px solid ${bubble}`,
          }}/>
          {text}
        </div>
      </div>
      <span style={{ fontSize: 8, color: 'rgba(15,23,42,0.4)', marginTop: 20 }}>14:33</span>
    </div>
  );
}

Object.assign(window, { ChatBeforeMobile });
