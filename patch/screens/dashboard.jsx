// BAPS Dashboard — recreated from src/app/page.tsx + calorie-gauge + weekly-calendar + meal-timeline + water-counter

function WeeklyCalendarStrip() {
  const days = [
    { d: 16, w: '수' }, { d: 17, w: '목' }, { d: 18, w: '금' }, { d: 19, w: '토' },
    { d: 20, w: '일', sunday: true }, { d: 21, w: '월' }, { d: 22, w: '화', selected: true, today: true },
  ];
  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>2026년 4월</p>
      </div>
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {days.map(({d,w,selected,today,sunday}) => (
          <button key={d} style={{
            flex: '0 0 auto', minWidth: 40, padding: '8px 4px',
            border: selected ? 'none' : '1px solid #cbd5e1',
            borderRadius: 12,
            background: selected ? '#6366f1' : 'rgba(255,255,255,0.85)',
            color: selected ? '#fff' : (sunday ? '#dc2626' : '#0f172a'),
            boxShadow: selected ? '0 4px 10px rgba(99,102,241,0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
          }}>
            <span style={{ fontSize: 9, fontWeight: 500, color: selected ? '#fff' : (sunday ? '#dc2626' : '#64748b') }}>{w}</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{d}</span>
            <span style={{ height: 4, display: 'flex', alignItems: 'center' }}>
              {today && <span style={{ width: 4, height: 4, borderRadius: 2, background: selected ? '#fff' : '#6366f1' }}/>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalorieGaugeCard() {
  // 3 concentric semicircle arcs — carb / protein / fat
  const cx = 145, cy = 108;
  const stroke = 7, gap = 14, step = stroke + gap;
  const rFat = 102, rProt = rFat - step, rCarb = rProt - step;
  const arc = (r) => {
    const x1 = cx + r * Math.cos(Math.PI); const y1 = cy;
    const x2 = cx + r * Math.cos(0); const y2 = cy;
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const drawRing = (r, ratio, stop, glowCol) => {
    const arcLen = Math.PI * r;
    const fill = Math.min(ratio, 1);
    const off = arcLen - fill * arcLen;
    return (
      <g>
        <path d={arc(r)} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke="rgba(226,232,240,0.55)"/>
        <path d={arc(r)} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={stop}
          strokeDasharray={arcLen} strokeDashoffset={off}
          style={{ filter: `drop-shadow(0 0 6px ${glowCol})` }}/>
      </g>
    );
  };

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 28,
      border: '1px solid rgba(0,0,0,0.06)',
      background: `
        radial-gradient(ellipse 110% 85% at 50% 0%, rgba(45,212,191,0.12), transparent 50%),
        radial-gradient(ellipse 100% 80% at 0% 100%, rgba(99,102,241,0.08), transparent 52%),
        rgba(255,255,255,0.55)
      `,
      backdropFilter: 'blur(12px)',
      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
      padding: 24,
    }}>
      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 999,
          border: '1px solid rgba(45,212,191,0.45)',
          background: 'rgba(45,212,191,0.1)',
          color: '#14b8a6',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
          boxShadow: '0 0 12px rgba(45,212,191,0.4)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: '#14b8a6' }}/>
          시스템 정상
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 6 }}>
        {/* Left macro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 28, alignItems: 'flex-end' }}>
          <MacroReadout label="탄수화물" cur={186} tgt={240} color="#6366f1" align="right"/>
          <MacroReadout label="단백질" cur={92} tgt={110} color="#14b8a6" align="right"/>
        </div>

        {/* Gauge */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="100%" height="104" viewBox="0 0 290 136" style={{ overflow: 'visible' }}>
            {drawRing(rCarb, 186/240, '#7c84f4', 'rgba(99,102,241,0.48)')}
            {drawRing(rProt, 92/110, '#47ddc9', 'rgba(45,212,191,0.52)')}
            {drawRing(rFat, 38/65, '#f08745', 'rgba(234,88,12,0.5)')}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 4 }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="#14b8a6" strokeWidth="2"/></svg>
            <p style={{
              margin: 0, fontFamily: '"JetBrains Mono", monospace',
              fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
              color: '#0f172a',
              textShadow: '0 0 20px rgba(15,23,42,0.08)',
            }}>1,624</p>
            <p style={{
              margin: 0, fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12, color: '#64748b',
            }}>/ 2,200 <span style={{ fontWeight: 600 }}>kcal</span></p>
          </div>
        </div>

        {/* Right macro */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 28 }}>
          <MacroReadout label="지방" cur={38} tgt={65} color="#ea580c" align="left"/>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        position: 'relative', marginTop: 20, width: '100%', height: 14,
        borderRadius: 999, overflow: 'hidden',
        border: '1px solid rgba(226,232,240,0.5)', background: 'rgba(241,245,249,0.45)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: '73.8%',
          borderRadius: 999,
          background: 'linear-gradient(90deg, #6366f1, #2dd4bf, #ea580c)',
          boxShadow: '0 0 14px rgba(45,212,191,0.38)',
        }}/>
      </div>
      <p style={{ margin: '8px 0 0', fontFamily: '"JetBrains Mono", monospace', fontSize: 10, color: '#64748b' }}>
        일일 에너지 소진 <span style={{ color: '#0f172a', fontWeight: 600 }}>74%</span>
      </p>

      {/* zone message */}
      <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#64748b' }}>
        좋아요! 여유 있어요 🙂
      </p>

      {/* metric row */}
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>74%</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#64748b' }}>달성률</p>
        </div>
        <div style={{ width: 1, background: 'rgba(226,232,240,0.8)' }}/>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>576</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#64748b' }}>남은 kcal</p>
        </div>
      </div>

      {/* Coach next action */}
      <div style={{
        marginTop: 16, padding: '10px 12px', borderRadius: 16,
        border: '1px solid rgba(226,232,240,0.6)',
        background: 'rgba(255,255,255,0.25)',
        textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#0f172a', lineHeight: 1.45,
      }}>
        저녁은 단백질 위주로. 남은 576kcal 안에서 정리합시다.
      </div>
      <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 10, color: '#64748b' }}>
        Live signal · 끼니 3회 감지 · 탄 78% 달성
      </p>
    </div>
  );
}

function MacroReadout({ label, cur, tgt, color, align }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      alignItems: align === 'right' ? 'flex-end' : 'flex-start',
      textAlign: align,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', lineHeight: 1.2 }}>{label}</span>
      <p style={{
        margin: 0, fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11, fontWeight: 600, lineHeight: 1.2, color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {cur}<span style={{ color: 'rgba(100,116,139,0.85)', margin: '0 2px' }}>/</span>{tgt}
        <span style={{ color: '#64748b', marginLeft: 2, fontSize: '0.85em' }}>g</span>
      </p>
    </div>
  );
}

function DailyQuipBanner() {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 12,
      border: '1px solid rgba(99,102,241,0.15)',
      background: `
        linear-gradient(to right, rgba(99,102,241,0.07) 1px, transparent 1px) 0 0 / 12px 12px,
        linear-gradient(to bottom, rgba(99,102,241,0.07) 1px, transparent 1px) 0 0 / 12px 12px,
        linear-gradient(135deg, rgba(99,102,241,0.06), rgba(248,250,252,0.8), rgba(45,212,191,0.08))
      `,
      boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 0 14px rgba(99,102,241,0.2)',
      padding: '12px 14px',
    }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ flexShrink: 0, fontSize: 12 }}>🔍</span>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(15,23,42,0.9)' }}>
            배분 나쁘지 않아요. 이러다 진짜 습관 됩니다.
          </span>
        </li>
      </ul>
    </div>
  );
}

function WaterCounterCard() {
  const cups = 4, target = 8, pct = 50;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: 10,
      borderRadius: 16, border: '1px solid rgba(226,232,240,0.8)',
      background: 'rgba(255,255,255,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      minHeight: 352,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '0 2px 6px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>
        </svg>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>물 섭취</h3>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>8잔 · 2,000ml</p>
        </div>
      </div>
      {/* Bottle viz */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
        <div style={{ position: 'relative', width: 110, height: 180 }}>
          <svg viewBox="0 0 110 180" width="110" height="180">
            <defs>
              <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4"/>
                <stop offset="100%" stopColor="#14b8a6"/>
              </linearGradient>
            </defs>
            <rect x="40" y="2" width="30" height="12" rx="3" fill="#cbd5e1"/>
            <path d="M 20 22 Q 20 14 30 14 L 80 14 Q 90 14 90 22 L 90 170 Q 90 178 80 178 L 30 178 Q 20 178 20 170 Z"
              fill="none" stroke="#94a3b8" strokeWidth="1.5"/>
            <clipPath id="bottleClip">
              <path d="M 20 22 Q 20 14 30 14 L 80 14 Q 90 14 90 22 L 90 170 Q 90 178 80 178 L 30 178 Q 20 178 20 170 Z"/>
            </clipPath>
            <g clipPath="url(#bottleClip)">
              <rect x="20" y={22 + (158 * (1 - pct/100))} width="70" height={158 * pct/100} fill="url(#wfill)"/>
            </g>
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 700, color: '#0f172a',
          }}>{pct}%</div>
        </div>
      </div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, maxWidth: 210, alignSelf: 'center', width: '100%' }}>
        <button style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid #e2e8f0',
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>
        </button>
        <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
          {cups}<span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>/{target}</span>
        </span>
        <button style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(15,118,110,0.3)',
          background: 'rgba(15,118,110,0.88)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>
        1,000ml · 권장 2,000ml
      </p>
    </div>
  );
}

function WeightSparkCard() {
  return (
    <div style={{
      padding: 10, borderRadius: 16, border: '1px solid rgba(226,232,240,0.8)',
      background: 'rgba(255,255,255,0.8)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      minHeight: 352, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '0 2px 6px' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>체중</h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>7일 추이</p>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <p style={{
          margin: 0, fontFamily: '"JetBrains Mono", monospace',
          fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a',
        }}>70.2<span style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginLeft: 2 }}>kg</span></p>
        <p style={{ margin: 0, fontSize: 11, color: '#059669', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
          ▼ -0.4kg · 7일
        </p>
        <svg width="140" height="56" style={{ marginTop: 8 }}>
          <path d="M 0 32 L 20 28 L 40 34 L 60 24 L 80 28 L 100 22 L 120 26 L 140 20"
            fill="none" stroke="#6366f1" strokeWidth="2"/>
          <path d="M 0 32 L 20 28 L 40 34 L 60 24 L 80 28 L 100 22 L 120 26 L 140 20 L 140 56 L 0 56 Z"
            fill="rgba(99,102,241,0.12)"/>
          <circle cx="140" cy="20" r="3" fill="#6366f1"/>
        </svg>
      </div>
      <button style={{
        width: '100%', marginTop: 8, padding: '8px 12px',
        border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff',
        fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer',
      }}>+ 체중 기록</button>
    </div>
  );
}

function MealTimelineSection() {
  const slots = [
    { emoji: '🌅', title: '아침', hint: '07-10시' },
    { emoji: '☀️', title: '점심', hint: '11-14시', meal: { name: '닭가슴살 샐러드 볼', kcal: 520, time: '13:24', badge: '점심', img: '#f97316' } },
    { emoji: '🌇', title: '저녁', hint: '17-21시', meal: { name: '연어 스테이크', kcal: 680, time: '19:10', badge: '저녁', img: '#fb7185' } },
    { emoji: '🌙', title: '야식', hint: '22-04시' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {slots.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 2px' }}>
            <span style={{ fontSize: 18 }}>{s.emoji}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f172a' }}>{s.title}</p>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>{s.hint}</p>
            </div>
          </div>
          {s.meal ? <MealTrayCard meal={s.meal}/> : <EmptySlot emoji={s.emoji} title={s.title}/>}
        </div>
      ))}
    </div>
  );
}

function EmptySlot({ emoji, title }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 48, borderRadius: 12,
      border: '2px dashed rgba(100,116,139,0.2)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#64748b' }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        {title} 식사 추가
      </span>
    </div>
  );
}

function MealTrayCard({ meal }) {
  return (
    <div style={{
      position: 'relative', padding: '12px 40px 12px 12px',
      borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      <button style={{
        position: 'absolute', right: 8, top: 8,
        border: 'none', background: 'transparent', cursor: 'pointer',
        padding: 6, borderRadius: 8, color: 'rgba(100,116,139,0.4)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ width: 14, display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, opacity: 0.6 }}>
            {Array.from({length: 6}).map((_,i)=><span key={i} style={{ width: 2.5, height: 2.5, borderRadius: 2, background: 'rgba(100,116,139,0.4)' }}/>)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
          {/* image */}
          <div style={{
            width: 56, height: 56, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${meal.img}, ${meal.img}aa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>🍽️</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 999,
                background: 'rgba(99,102,241,0.12)', color: '#6366f1',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
              }}>{meal.badge}</span>
              <p style={{
                margin: 0, fontFamily: '"JetBrains Mono", monospace',
                fontSize: 18, fontWeight: 700, color: '#0f172a',
              }}>{meal.kcal}<span style={{ fontSize: 11, color: '#64748b', marginLeft: 2, fontWeight: 600 }}>kcal</span></p>
              <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b' }}>{meal.time}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{meal.name}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 600 }}>탄 42g</span>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.35)', color: '#0d9488', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 600 }}>단 38g</span>
              <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', color: '#92400e', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 600 }}>지 18g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionFab() {
  return (
    <div style={{ position: 'absolute', left: '50%', bottom: 32, transform: 'translateX(-50%)', zIndex: 40 }}>
      <button style={{
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: '#6366f1', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 28px rgba(99,102,241,0.45), 0 4px 10px rgba(0,0,0,0.1)',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  );
}

function ChatFab() {
  return (
    <div style={{ position: 'absolute', right: 16, bottom: 32, zIndex: 40 }}>
      <button style={{
        width: 52, height: 52, borderRadius: 18, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(99,102,241,0.4), 0 0 0 2px rgba(129,140,248,0.3)',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </button>
    </div>
  );
}

function BapsDashboardScreen() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#f8fafc', color: '#0f172a', overflow: 'hidden',
      fontFamily: '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 10px', borderBottom: '1px solid rgba(226,232,240,0.7)',
      }}>
        <p style={{
          margin: 0, fontFamily: '"JetBrains Mono", monospace',
          fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a',
        }}>BAPS</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: '#e2e8f0' }}/>
        </div>
        {/* scan glow */}
        <div style={{
          position: 'absolute', bottom: -1, left: 0, width: '42%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.95), rgba(56,189,248,0.1), transparent)',
          boxShadow: '0 0 6px rgba(129,140,248,0.55), 0 0 14px rgba(56,189,248,0.25)',
        }}/>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0 100px' }}>
        <WeeklyCalendarStrip/>
        <div style={{ padding: '16px 16px 0' }}>
          <DailyQuipBanner/>
        </div>
        <div style={{ padding: '12px 16px 0' }}>
          <CalorieGaugeCard/>
        </div>
        <div style={{ padding: '12px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <WaterCounterCard/>
          <WeightSparkCard/>
        </div>
        <div style={{ padding: '20px 16px 0' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>오늘의 기록</p>
          <MealTimelineSection/>
        </div>
      </div>

      <QuickActionFab/>
      <ChatFab/>
    </div>
  );
}

window.BapsDashboardScreen = BapsDashboardScreen;
