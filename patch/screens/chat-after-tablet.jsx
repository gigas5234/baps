// BAPS Chat Redesign — Tablet view (2-pane: Coach rail + Thread)
// 같은 Soft/Ambient 시스템으로, 태블릿에선 코치 목록을 상시 노출

function ChatAfterTablet() {
  const T = window.ChatTokens;
  const coaches = window.CoachData;
  const selectedId = 'nutrition';
  const coach = coaches.find(c => c.id === selectedId);
  const hue = T.coaches[coach.id];

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: T.appBg, color: T.ink, fontFamily: T.font,
      display: 'flex', position: 'relative',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 40% at 30% 0%, ${hue.tint}, transparent 65%)`,
      }}/>

      {/* Left rail — coach roster (always visible) */}
      <aside style={{
        flexShrink: 0, width: 280, background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1,
      }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, color: T.inkFaint, letterSpacing: '0.14em' }}>BAPS · COACH ROOM</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>오늘의 감시 코치</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {coaches.map(c => {
            const ch = T.coaches[c.id];
            const sel = c.id === selectedId;
            return (
              <button key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '10px 12px', marginBottom: 2,
                border: 'none', background: sel ? ch.soft : 'transparent',
                borderRadius: T.r.md, textAlign: 'left', cursor: 'pointer',
                fontFamily: T.font,
                position: 'relative',
              }}>
                {sel && <div style={{ position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2, background: ch.hue }}/>}
                <div style={{
                  width: 36, height: 36, borderRadius: T.r.md,
                  background: sel ? T.surface : ch.soft,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                  boxShadow: sel ? T.shadowSoft : 'none',
                }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: '-0.01em' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.tagline}
                  </div>
                </div>
                {sel && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: ch.hue, boxShadow: `0 0 0 3px ${ch.hue}22`, flexShrink: 0 }}/>
                )}
              </button>
            );
          })}
        </div>

        {/* TTS bar at bottom */}
        <div style={{ padding: 12, borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: T.r.md,
            background: T.surfaceMuted,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
              {[0.3, 0.8, 0.5, 1, 0.7].map((s, i) => (
                <span key={i} style={{ width: 2, height: '100%', background: hue.hue, borderRadius: 1, transform: `scaleY(${s})`, transformOrigin: 'bottom', opacity: 0.9 }}/>
              ))}
            </div>
            <div style={{ fontSize: 11, fontFamily: T.fontMono, color: hue.ink, fontWeight: 600 }}>TTS · ON</div>
          </div>
          <button style={{
            width: 32, height: 32, borderRadius: T.r.md, border: `1px solid ${T.border}`,
            background: T.surface, cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={T.inkMuted} strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={T.inkMuted} strokeWidth="1.5"/></svg>
          </button>
        </div>
      </aside>

      {/* Right pane — Thread */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Thread header */}
        <div style={{
          padding: '14px 24px', borderBottom: `1px solid ${T.border}`,
          background: T.surface,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: T.r.md,
            background: hue.soft, color: hue.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19,
          }}>{coach.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{coach.name} 코치</span>
              <span style={{
                fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 6px', borderRadius: 4, background: hue.soft, color: hue.ink,
              }}>{hue.label.toUpperCase()}</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: hue.hue, boxShadow: `0 0 0 3px ${hue.hue}22` }}/>
            </div>
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 1 }}>{coach.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ padding: '6px 12px', borderRadius: T.r.pill, border: `1px solid ${T.border}`, background: T.surface, fontSize: 11, fontWeight: 600, color: T.inkMuted, cursor: 'pointer', fontFamily: T.font }}>
              기록 내보내기
            </button>
            <button style={{ padding: '6px 12px', borderRadius: T.r.pill, border: `1px solid ${T.border}`, background: T.surface, fontSize: 11, fontWeight: 600, color: T.inkMuted, cursor: 'pointer', fontFamily: T.font }}>
              새 세션
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ alignSelf: 'center', padding: '4px 10px', borderRadius: T.r.pill, background: T.surfaceMuted, fontSize: 10, fontFamily: T.fontMono, letterSpacing: '0.08em', color: T.inkFaint }}>
            SESSION · 오늘 14:32
          </div>

          <TabletUser text="오늘 단백질 좀 부족한 것 같은데 저녁 뭐 먹지?"/>
          <TabletCoachTurn coach={coach} hue={hue}/>
          <TabletDataCard hue={hue}/>
          <TabletUser text="연어 스테이크는 어때?"/>
          <TabletStreaming coach={coach} hue={hue}/>
        </div>

        {/* Composer */}
        <div style={{ padding: '14px 24px 20px', borderTop: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {['저녁 추천', '운동 환산', '남은 예산', '단백질 보충 2가지'].map(c => (
              <button key={c} style={{
                padding: '6px 12px', height: 28, borderRadius: T.r.pill,
                border: `1px solid ${hue.hue}33`, background: hue.soft,
                fontSize: 11, fontWeight: 600, color: hue.ink,
                cursor: 'pointer', fontFamily: T.font,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: hue.hue }}/>
                {c}
              </button>
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 8px 8px 16px',
            background: T.appBg, borderRadius: T.r.pill,
            border: `1px solid ${T.border}`,
          }}>
            <input placeholder="무엇이든 물어보세요" style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 13.5, color: T.ink, outline: 'none',
              fontFamily: T.font, padding: '6px 0',
            }}/>
            <button style={{ width: 32, height: 32, borderRadius: T.r.pill, border: 'none', background: 'transparent', color: T.inkMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 106 0V5a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button style={{ width: 34, height: 34, borderRadius: T.r.pill, border: 'none', background: hue.hue, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l14-7-4 16-3-7-7-2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function TabletUser({ text }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 8 }}>
      <span style={{ fontSize: 10, color: T.inkFaint, marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>14:32</span>
      <div style={{
        maxWidth: '60%', background: T.ink, color: '#fff',
        padding: '10px 15px', borderRadius: `${T.r.lg}px ${T.r.lg}px 4px ${T.r.lg}px`,
        fontSize: 13.5, lineHeight: 1.5,
      }}>{text}</div>
    </div>
  );
}

function TabletCoachTurn({ coach, hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: '78%' }}>
      <div style={{
        width: 36, height: 36, borderRadius: T.r.md,
        background: hue.soft, color: hue.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{coach.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{coach.name} 코치</span>
          <span style={{ fontSize: 10, color: T.inkFaint }}>14:33</span>
        </div>
        <div style={{ background: T.surface, borderRadius: T.r.lg, border: `1px solid ${T.border}`, boxShadow: T.shadowSoft, overflow: 'hidden' }}>
          <TabletBlock tag="ANALYSIS" color={hue.ink} bg={hue.soft} text="오늘 단백질 52g · 목표 110g. 결핍률 -52%, 근 이화 진입 경계선."/>
          <div style={{ height: 1, background: T.border }}/>
          <TabletBlock tag="ROAST" color="#be123c" bg="#fde8ec" italic text="샐러드를 먹고도 단백질을 피해 다니는 재주, 인정한다."/>
          <div style={{ height: 1, background: T.border }}/>
          <TabletBlock tag="MISSION" color="#b45309" bg="#fdecd0" bold text="저녁: 연어 200g + 퀴노아 ½컵 + 그린빈 명령. 목표 -100g 달성."/>
        </div>
      </div>
    </div>
  );
}

function TabletBlock({ tag, color, bg, text, italic, bold }) {
  const T = window.ChatTokens;
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'inline-block', fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em', color, background: bg, padding: '2px 7px', borderRadius: 4, marginBottom: 6 }}>{tag}</div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: T.ink, fontStyle: italic ? 'italic' : 'normal', fontWeight: bold ? 600 : 400 }}>{text}</p>
    </div>
  );
}

function TabletDataCard({ hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ marginLeft: 48, maxWidth: '60%' }}>
      <div style={{ background: T.surface, borderRadius: T.r.lg, border: `1px solid ${T.border}`, padding: '14px 16px', boxShadow: T.shadowSoft }}>
        <div style={{ fontSize: 10, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em', color: T.inkMuted, marginBottom: 8 }}>오늘 단백질 현황</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>52</span>
          <span style={{ fontSize: 13, color: T.inkMuted }}>/ 110g</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: T.fontMono, fontWeight: 700, color: '#be123c' }}>-53%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.surfaceMuted, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '47%', background: hue.hue, borderRadius: 3 }}/>
        </div>
      </div>
    </div>
  );
}

function TabletStreaming({ coach, hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: '78%' }}>
      <div style={{
        width: 36, height: 36, borderRadius: T.r.md,
        background: hue.soft, color: hue.ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0, boxShadow: T.shadowGlow(hue.hue),
        animation: 'baps-pulse 1.4s ease-in-out infinite',
      }}>{coach.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{coach.name} 코치 · 분석 중</div>
        <div style={{ background: T.surface, borderRadius: T.r.lg, padding: '12px 16px', border: `1px solid ${hue.hue}33`, boxShadow: T.shadowGlow(hue.hue), fontSize: 13.5, lineHeight: 1.5 }}>
          연어는 우수한 선택. 200g = 단백질 45g · 오메가3 3.2g 확정
          <span style={{ display: 'inline-flex', gap: 3, marginLeft: 6, verticalAlign: 'middle' }}>
            <span className="baps-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: hue.hue, opacity: 0.4, animation: 'baps-dot 1s ease-in-out infinite' }}/>
            <span className="baps-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: hue.hue, opacity: 0.4, animation: 'baps-dot 1s ease-in-out infinite 0.15s' }}/>
            <span className="baps-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: hue.hue, opacity: 0.4, animation: 'baps-dot 1s ease-in-out infinite 0.3s' }}/>
          </span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
            {[0.4, 0.9, 0.6, 1, 0.7, 0.5, 0.8].map((s, i) => (
              <span key={i} style={{ width: 2, height: '100%', background: hue.hue, borderRadius: 1, animation: `baps-eq 0.8s ease-in-out infinite ${i*0.08}s`, opacity: 0.85 }}/>
            ))}
          </div>
          <span style={{ fontSize: 10, fontFamily: T.fontMono, color: hue.ink, fontWeight: 600, letterSpacing: '0.05em' }}>
            {coach.name} 코치 · 읽는 중
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ChatAfterTablet });
