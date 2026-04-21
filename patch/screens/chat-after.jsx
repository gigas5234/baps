// BAPS Chat Redesign — After (Soft/Ambient) · Mobile
// 3가지 상태: Atrium (첫 진입), Roster (코치 선택), Thread (대화 중)
// 기존 토큰 유지 + 카톡 잔재(아바타·꼬리·말풍선 컬러) 제거

function ChatAfterMobile({ state = 'atrium', coach: coachId = 'diet' }) {
  const T = window.ChatTokens;
  const coaches = window.CoachData;
  const coach = coaches.find(c => c.id === coachId) || coaches[0];
  const hue = T.coaches[coach.id];

  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden',
      background: T.appBg, color: T.ink,
      fontFamily: T.font, display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Ambient backdrop — coach-tinted aura */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 90% 40% at 50% 0%, ${hue.tint}, transparent 60%),
          radial-gradient(ellipse 60% 30% at 20% 100%, ${hue.tint}, transparent 70%)
        `,
        opacity: 0.9, transition: 'background 400ms ease',
      }} />

      {/* Top bar */}
      <TopBar coach={coach} hue={hue} state={state} />

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {state === 'atrium' && <AtriumView coaches={coaches} selected={coach.id} />}
        {state === 'roster' && <AtriumView coaches={coaches} selected={coach.id} opened />}
        {state === 'thread' && <ThreadView coach={coach} hue={hue} />}
      </div>

      {/* Composer */}
      <Composer state={state} hue={hue} />
    </div>
  );
}

function TopBar({ coach, hue, state }) {
  const T = window.ChatTokens;
  const showCoach = state === 'thread' || state === 'roster';
  return (
    <div style={{
      flexShrink: 0, padding: '12px 16px 10px',
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative', zIndex: 2,
    }}>
      <button style={{
        width: 36, height: 36, borderRadius: T.r.md, border: 'none',
        background: T.surface, boxShadow: T.shadowSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', padding: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke={T.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {showCoach ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
              <span style={{ fontSize: 15 }}>{coach.emoji}</span>
              {coach.name} 코치
              <span style={{
                fontSize: 9, fontFamily: T.fontMono, fontWeight: 600, letterSpacing: '0.05em',
                padding: '2px 6px', borderRadius: 4, background: hue.soft, color: hue.ink,
                marginLeft: 2,
              }}>{hue.label.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 11, color: T.inkMuted }}>{coach.role}</div>
          </div>
        ) : (
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>
            코치 룸
          </div>
        )}
      </div>

      {/* TTS toggle — pill, EQ-ish */}
      <button style={{
        height: 32, padding: '0 10px', borderRadius: T.r.pill,
        border: `1px solid ${T.border}`, background: T.surface,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 600, color: T.inkMuted,
        cursor: 'pointer',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 10v4h3l4 4V6L6 10H3z M14 8a5 5 0 010 8" stroke={T.inkMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        TTS
      </button>
    </div>
  );
}

// ───────────────────────────────── Atrium (first entry) ─────────────────────────────────

function AtriumView({ coaches, selected, opened = false }) {
  const T = window.ChatTokens;
  const sel = coaches.find(c => c.id === selected);
  const hue = T.coaches[sel.id];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Welcome */}
      <div style={{ marginTop: 20 }}>
        <div style={{
          fontSize: 10, fontFamily: T.fontMono, fontWeight: 600, letterSpacing: '0.14em',
          color: T.inkFaint, marginBottom: 10,
        }}>BAPS · COACH ROOM</div>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 800, lineHeight: 1.15,
          letterSpacing: '-0.03em', color: T.ink,
        }}>
          오늘 누구에게<br/>
          <span style={{ color: hue.hue }}>감시</span>받으실래요?
        </h1>
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.5, color: T.inkMuted, maxWidth: '26ch' }}>
          다섯 코치 중 한 명을 골라요.<br/>
          각자 관점과 말투가 다릅니다.
        </p>
      </div>

      {/* Coach grid — 2 columns, taller cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {coaches.map(c => {
          const ch = T.coaches[c.id];
          const isSel = c.id === selected && opened;
          return (
            <div key={c.id} style={{
              padding: '14px 12px 12px',
              borderRadius: T.r.lg,
              background: isSel ? ch.soft : T.surface,
              boxShadow: isSel ? T.shadowGlow(ch.hue) : T.shadowSoft,
              border: `1px solid ${isSel ? ch.hue + '33' : T.border}`,
              transition: 'all 180ms ease',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Status dot on selected */}
              {isSel && (
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 6, height: 6, borderRadius: '50%', background: ch.hue,
                  boxShadow: `0 0 0 3px ${ch.hue}22`,
                }} />
              )}
              <div style={{
                fontSize: 24, lineHeight: 1, marginBottom: 10, filter: isSel ? 'none' : 'grayscale(0.15)',
              }}>{c.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: T.ink }}>
                {c.name}
              </div>
              <div style={{ fontSize: 10, color: T.inkMuted, marginTop: 2, lineHeight: 1.35 }}>
                {c.tagline}
              </div>
              {/* Voice sample tag */}
              <div style={{
                marginTop: 10, padding: '5px 7px',
                borderRadius: 6, background: isSel ? T.surface : T.surfaceMuted,
                fontSize: 9, fontFamily: T.fontMono, fontWeight: 600, letterSpacing: '0.03em',
                color: ch.ink, border: `1px dashed ${ch.hue}33`,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{c.voice}</div>
            </div>
          );
        })}
      </div>

      {/* Selected coach detail panel (only when opened/roster state) */}
      {opened && (
        <div style={{
          borderRadius: T.r.lg,
          padding: '14px 14px 12px',
          background: T.surface,
          boxShadow: T.shadowRaised,
          border: `1px solid ${T.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Left accent rail — coach hue */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: hue.hue }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontFamily: T.fontMono, color: hue.ink, fontWeight: 700, letterSpacing: '0.08em' }}>
              {sel.name.toUpperCase()} · {sel.role}
            </div>
          </div>
          <p style={{
            margin: 0, fontSize: 13.5, lineHeight: 1.5, color: T.ink, fontWeight: 500,
          }}>
            "{coachAtriumLine(sel.id)}"
          </p>
          <button style={{
            marginTop: 12, width: '100%', height: 42,
            borderRadius: T.r.md, border: 'none',
            background: hue.hue, color: '#fff',
            fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: T.font,
          }}>
            {sel.name} 코치 시작하기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function coachAtriumLine(id) {
  return ({
    diet: '숟가락 속도까지 체크합니다. 숨길 생각 마세요. 데이터는 다 보고 있습니다.',
    nutrition: '몸은 정직한 화학 실험실입니다. 쓰레기를 넣고 금이 나오길 바라지 마세요.',
    exercise: '근육은 배신하지만 당신은 매일 근육을 배신합니다. 오늘 흘린 땀, 0g입니까?',
    mental: '지금 배가 고픈 건가요, 마음이 허한 건가요? 감정에 속아 입을 벌리지 마세요.',
    roi: '그 간식 하나 태우려면 버피 200개입니다. 1시간을 과자 한 봉지와 바꿀 건가요?',
  })[id];
}

// ───────────────────────────────── Thread (active chat) ─────────────────────────────────

function ThreadView({ coach, hue }) {
  const T = window.ChatTokens;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Session header chip */}
      <div style={{
        alignSelf: 'center', marginTop: 4, marginBottom: 4,
        padding: '4px 10px', borderRadius: T.r.pill,
        background: T.surfaceMuted,
        fontSize: 10, fontFamily: T.fontMono, letterSpacing: '0.08em', color: T.inkFaint,
      }}>SESSION · 14:32</div>

      {/* Opening — user msg */}
      <UserBubble text="오늘 점심 뭐 먹으면 좋을까?" time="14:32" />

      {/* Coach turn card — 통합 카드 (analysis → roast → mission) */}
      <CoachTurnCard coach={coach} hue={hue} />

      {/* Data card — inline */}
      <DataCard hue={hue} />

      {/* User follow-up */}
      <UserBubble text="그럼 샐러드 볼로 할게" time="14:35" />

      {/* Live-typing preview with TTS halo */}
      <CoachStreamingBubble coach={coach} hue={hue} />
    </div>
  );
}

function UserBubble({ text, time }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 6 }}>
      <span style={{ fontSize: 10, color: T.inkFaint, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
      <div style={{
        maxWidth: '75%',
        background: T.ink, color: '#fff',
        padding: '9px 13px', borderRadius: `${T.r.lg}px ${T.r.lg}px 4px ${T.r.lg}px`,
        fontSize: 13.5, lineHeight: 1.45, letterSpacing: '-0.005em',
      }}>{text}</div>
    </div>
  );
}

function CoachTurnCard({ coach, hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {/* Coach label sidebar — compact vertical name */}
      <div style={{ flexShrink: 0, width: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: T.r.md,
          background: hue.soft, color: hue.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>{coach.emoji}</div>
        <div style={{
          fontSize: 8, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em',
          color: hue.ink, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          marginTop: 2,
        }}>{coach.name.toUpperCase()}</div>
      </div>

      {/* Turn card */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{
          background: T.surface, borderRadius: T.r.lg,
          boxShadow: T.shadowSoft, border: `1px solid ${T.border}`,
          overflow: 'hidden',
        }}>
          {/* Analysis */}
          <TurnBlock
            tag="ANALYSIS" tagColor={hue.ink} tagBg={hue.soft}
            text="오늘 점심까진 탄수 62%·단백질 18%. 단백질 결핍으로 근 이화 진행 중."
          />
          <div style={{ height: 1, background: T.border }} />
          {/* Roast/quip */}
          <TurnBlock
            tag="ROAST" tagColor="#be123c" tagBg="#fde8ec"
            text="또 덮밥이야? 패턴 포착 — 주 3회 탄수 과부하 확정."
            italic
          />
          <div style={{ height: 1, background: T.border }} />
          {/* Mission */}
          <TurnBlock
            tag="MISSION" tagColor="#b45309" tagBg="#fdecd0"
            text="닭가슴살 120g + 현미밥 ½ + 나물 2종으로 교체 명령."
            bold
          />
        </div>
        <div style={{ fontSize: 10, color: T.inkFaint, marginTop: 4, marginLeft: 2, fontVariantNumeric: 'tabular-nums' }}>14:33</div>
      </div>
    </div>
  );
}

function TurnBlock({ tag, tagColor, tagBg, text, italic, bold }) {
  const T = window.ChatTokens;
  return (
    <div style={{ padding: '11px 13px 10px' }}>
      <div style={{
        display: 'inline-block',
        fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em',
        color: tagColor, background: tagBg,
        padding: '2px 6px', borderRadius: 4, marginBottom: 6,
      }}>{tag}</div>
      <p style={{
        margin: 0, fontSize: 13, lineHeight: 1.5,
        color: T.ink,
        fontStyle: italic ? 'italic' : 'normal',
        fontWeight: bold ? 600 : 400,
      }}>{text}</p>
    </div>
  );
}

function CoachStreamingBubble({ coach, hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: 28, paddingTop: 4 }}>
        <div style={{
          width: 28, height: 28, borderRadius: T.r.md,
          background: hue.soft, color: hue.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
          boxShadow: T.shadowGlow(hue.hue),
          animation: 'baps-pulse 1.4s ease-in-out infinite',
        }}>{coach.emoji}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: T.surface, borderRadius: T.r.lg,
          padding: '11px 13px',
          boxShadow: T.shadowGlow(hue.hue),
          border: `1px solid ${hue.hue}33`,
          fontSize: 13, lineHeight: 1.5, color: T.ink,
        }}>
          <div style={{ display: 'inline-block', fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em', color: hue.ink, background: hue.soft, padding: '2px 6px', borderRadius: 4, marginBottom: 6 }}>분석 중</div>
          <div>
            샐러드 볼의 드레싱에 주목. 오리엔탈 소스 한 봉 = 95kcal,
            <span style={{ display: 'inline-flex', gap: 2, marginLeft: 4, verticalAlign: 'middle' }}>
              <Dot delay={0}/> <Dot delay={0.15}/> <Dot delay={0.3}/>
            </span>
          </div>
        </div>
        {/* Live EQ (TTS speaking) */}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2 }}>
          <LiveEq hue={hue.hue}/>
          <span style={{ fontSize: 10, fontFamily: T.fontMono, color: hue.ink, fontWeight: 600, letterSpacing: '0.05em' }}>
            {coach.name} 코치 · 읽는 중
          </span>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return <span style={{
    width: 4, height: 4, borderRadius: '50%', background: 'currentColor',
    opacity: 0.4, animation: `baps-dot 1s ease-in-out infinite`, animationDelay: `${delay}s`,
    display: 'inline-block',
  }}/>;
}

function LiveEq({ hue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
      {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5, 0.8].map((s, i) => (
        <span key={i} style={{
          width: 2, height: '100%',
          background: hue, borderRadius: 1,
          transformOrigin: 'bottom',
          animation: `baps-eq 0.8s ease-in-out infinite`,
          animationDelay: `${i * 0.08}s`,
          opacity: 0.85,
        }}/>
      ))}
    </div>
  );
}

function DataCard({ hue }) {
  const T = window.ChatTokens;
  return (
    <div style={{ marginLeft: 36 }}>
      <div style={{
        background: T.surface, borderRadius: T.r.lg,
        border: `1px solid ${T.border}`, padding: '12px 13px 11px',
        boxShadow: T.shadowSoft,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontFamily: T.fontMono, fontWeight: 700, letterSpacing: '0.1em', color: T.inkMuted }}>
            오늘 남은 예산
          </span>
          <span style={{ flex: 1, height: 1, background: T.border }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>+480</span>
          <span style={{ fontSize: 11, color: T.inkMuted, fontFamily: T.fontMono }}>kcal</span>
        </div>
        {/* Macro bars */}
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: '탄', val: 62, bar: 62, c: '#b45309' },
            { label: '단', val: 18, bar: 18, c: '#047857' },
            { label: '지', val: 20, bar: 20, c: '#c96442' },
          ].map(m => (
            <div key={m.label}>
              <div style={{ fontSize: 9, fontFamily: T.fontMono, color: T.inkFaint, letterSpacing: '0.05em' }}>{m.label} {m.val}%</div>
              <div style={{ height: 3, borderRadius: 2, background: T.surfaceMuted, marginTop: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.bar}%`, background: m.c, borderRadius: 2 }}/>
              </div>
            </div>
          ))}
        </div>
        {/* Chip actions */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {['대체 메뉴 보기', '예산 다시 계산'].map(a => (
            <button key={a} style={{
              padding: '6px 10px', borderRadius: T.r.pill,
              border: `1px solid ${T.border}`, background: T.surface,
              fontSize: 11, fontWeight: 600, color: T.ink,
              cursor: 'pointer', fontFamily: T.font,
            }}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────── Composer ─────────────────────────────────

function Composer({ state, hue }) {
  const T = window.ChatTokens;
  const inputBg = T.surface;

  return (
    <div style={{ flexShrink: 0, padding: '6px 14px 14px', position: 'relative', zIndex: 2 }}>
      {/* Quick chips (only in thread) */}
      {state === 'thread' && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 8, overflow: 'hidden',
          WebkitMaskImage: 'linear-gradient(90deg, #000 88%, transparent)',
        }}>
          {['저녁 추천', '운동 환산', '남은 예산'].map(c => (
            <button key={c} style={{
              flexShrink: 0, padding: '6px 12px', height: 28,
              borderRadius: T.r.pill,
              border: `1px solid ${hue.hue}33`, background: hue.soft,
              fontSize: 11, fontWeight: 600, color: hue.ink,
              cursor: 'pointer', fontFamily: T.font,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: hue.hue }}/>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 6px 6px 14px',
        background: inputBg, borderRadius: T.r.pill,
        boxShadow: T.shadowSoft, border: `1px solid ${T.border}`,
      }}>
        <input
          placeholder={state === 'atrium' ? '코치를 고르거나 바로 질문하세요' : '무엇이든 물어보세요'}
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 13.5, color: T.ink, outline: 'none',
            fontFamily: T.font, padding: '8px 0',
          }}
        />
        {/* Voice button — inline, not separate HUD */}
        <button style={{
          width: 32, height: 32, borderRadius: T.r.pill, border: 'none',
          background: T.surfaceMuted, color: T.inkMuted,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2a3 3 0 00-3 3v6a3 3 0 106 0V5a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Send */}
        <button style={{
          width: 32, height: 32, borderRadius: T.r.pill, border: 'none',
          background: hue.hue, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, transition: 'background 160ms',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l14-7-4 16-3-7-7-2z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// Animations CSS injection (once)
if (typeof document !== 'undefined' && !document.getElementById('baps-chat-anim')) {
  const s = document.createElement('style');
  s.id = 'baps-chat-anim';
  s.textContent = `
    @keyframes baps-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.85} }
    @keyframes baps-dot   { 0%,60%,100%{opacity:.2;transform:translateY(0)} 30%{opacity:1;transform:translateY(-2px)} }
    @keyframes baps-eq    { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
  `;
  document.head.appendChild(s);
}

Object.assign(window, { ChatAfterMobile });
