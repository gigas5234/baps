// BAPS Meal Analysis — recreated from manual-meal-entry + meal-analysis-result

function BapsAnalysisScreen() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#f8fafc', color: '#0f172a', overflow: 'hidden',
      fontFamily: '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
      }}>
        <button style={{
          width: 36, height: 36, borderRadius: 12, border: '1px solid #e2e8f0',
          background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>분석 결과</p>
          <p style={{ margin: 0, fontSize: 10, fontFamily: '"JetBrains Mono", monospace', color: '#14b8a6', fontWeight: 600 }}>
            ● ANALYSIS COMPLETE · 98.4%
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {/* Photo + scan */}
        <div style={{
          position: 'relative', height: 200, borderRadius: 16, overflow: 'hidden',
          background: 'radial-gradient(circle at 50% 50%, #fb923c, #7c2d12)',
          border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 88 }}>🍱</div>
          {/* HUD markers */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <g stroke="#2dd4bf" fill="none" strokeWidth="0.2" vectorEffect="non-scaling-stroke">
              <path d="M6 6 L6 14 L14 14"/><path d="M94 6 L94 14 L86 14"/>
              <path d="M6 94 L6 86 L14 86"/><path d="M94 94 L94 86 L86 86"/>
            </g>
          </svg>
          {/* Tags */}
          <div style={{ position: 'absolute', top: '28%', left: '18%', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#2dd4bf', boxShadow: '0 0 8px #2dd4bf' }}/>
            <span style={{
              padding: '3px 8px', borderRadius: 6,
              background: 'rgba(15,23,42,0.85)', color: '#fff', backdropFilter: 'blur(4px)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600,
            }}>현미밥 · 210g</span>
          </div>
          <div style={{ position: 'absolute', top: '55%', right: '20%', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              padding: '3px 8px', borderRadius: 6,
              background: 'rgba(15,23,42,0.85)', color: '#fff', backdropFilter: 'blur(4px)',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 600,
            }}>제육볶음 · 180g</span>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }}/>
          </div>
        </div>

        {/* Fact banner */}
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 12,
          background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: 10, fontWeight: 700, color: '#f43f5e', letterSpacing: '0.06em' }}>
              FACT ALERT
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.45, color: '#0f172a', fontWeight: 500 }}>
              제육볶음의 당류가 하루 권장량의 68%입니다. 내일 점심은 담백하게 정리하죠.
            </p>
          </div>
        </div>

        {/* Kcal hero */}
        <div style={{
          marginTop: 14, padding: 16, borderRadius: 16,
          background: '#fff', border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#64748b' }}>총 칼로리</p>
            <p style={{
              margin: '2px 0 0', fontFamily: '"JetBrains Mono", monospace',
              fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a',
            }}>784<span style={{ fontSize: 13, color: '#64748b', marginLeft: 4, fontWeight: 600 }}>kcal</span></p>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#6366f1', fontFamily: '"JetBrains Mono", monospace', fontSize: 11, fontWeight: 700,
          }}>점심 · 13:24</div>
        </div>

        {/* Macro grid */}
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: '탄수화물', val: 92, unit: 'g', color: '#6366f1', pct: 38 },
            { label: '단백질', val: 34, unit: 'g', color: '#14b8a6', pct: 31 },
            { label: '지방', val: 22, unit: 'g', color: '#ea580c', pct: 34 },
          ].map((m,i)=>(
            <div key={i} style={{
              padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0',
            }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: '#64748b' }}>{m.label}</p>
              <p style={{
                margin: '4px 0 0', fontFamily: '"JetBrains Mono", monospace',
                fontSize: 18, fontWeight: 700, color: m.color,
              }}>{m.val}<span style={{ fontSize: 10, color: '#64748b', marginLeft: 2 }}>{m.unit}</span></p>
              <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ width: `${m.pct}%`, height: '100%', background: m.color }}/>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>{m.pct}% / 일일</p>
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>감지된 항목 2</p>
          {[
            { name: '현미밥', g: 210, kcal: 315 },
            { name: '제육볶음', g: 180, kcal: 469 },
          ].map((it,i)=>(
            <div key={i} style={{
              padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{it.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontFamily: '"JetBrains Mono", monospace' }}>{it.g}g</p>
              </div>
              <p style={{ margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {it.kcal}<span style={{ fontSize: 10, color: '#64748b', marginLeft: 2 }}>kcal</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '12px 16px 20px', borderTop: '1px solid #e2e8f0', background: '#fff',
        display: 'flex', gap: 8,
      }}>
        <button style={{
          flex: 1, height: 48, borderRadius: 12, border: '1px solid #e2e8f0',
          background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>수정</button>
        <button style={{
          flex: 2, height: 48, borderRadius: 12, border: 'none',
          background: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>식단에 저장</button>
      </div>
    </div>
  );
}

window.BapsAnalysisScreen = BapsAnalysisScreen;
