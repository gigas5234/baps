// BAPS Chat — Refactor Structure Diagram
// chat-fab.tsx 72KB (state 30+ · useEffect 10+ · ref 20+) → 모듈 분리 + 커스텀 훅

function RefactorDiagram() {
  const T = window.ChatTokens;
  return (
    <div style={{
      width: '100%', height: '100%', background: T.appBg, color: T.ink,
      fontFamily: T.font, padding: '24px 28px', overflow: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 10, fontFamily: T.fontMono, letterSpacing: '0.14em', color: T.inkFaint, marginBottom: 6 }}>
        REFACTOR · chat-fab.tsx
      </div>
      <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
        72KB → 8 modules
      </h2>
      <p style={{ margin: '0 0 18px', fontSize: 12.5, color: T.inkMuted, lineHeight: 1.5, maxWidth: '54ch' }}>
        관심사별로 쪼개고, ref 난발을 훅으로 흡수. 상태 30+개 → useReducer로 통합.
      </p>

      {/* Before/After side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Before */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.lg, padding: 14, boxShadow: T.shadowSoft }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontFamily: T.fontMono, fontWeight: 700, color: '#be123c', letterSpacing: '0.1em' }}>BEFORE</span>
            <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.inkFaint }}>1 file · 72KB</span>
          </div>
          <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.ink, lineHeight: 1.7 }}>
            <div style={{ padding: '8px 10px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>chat-fab.tsx</div>
              <div style={{ color: T.inkMuted, fontSize: 10 }}>
                useState × 18<br/>
                useRef × 23<br/>
                useEffect × 12<br/>
                useCallback × 8<br/>
                inline component × 6<br/>
                ≈ 1,800 lines
              </div>
            </div>
            <ul style={{ margin: '10px 0 0', paddingLeft: 14, fontSize: 10.5, color: T.inkMuted, lineHeight: 1.55 }}>
              <li>TTS 파이프라인이 컴포넌트 안에서 ref 7개로 분산</li>
              <li>음성 STT 세션이 handler 4개로 흩어짐</li>
              <li>아트리움 · 채팅 모드 토글이 4개 state로 얽힘</li>
              <li>openingCoachSynced/quickChipsBootstrapKeyRef 같은 동기화 트리거가 코드 곳곳</li>
            </ul>
          </div>
        </div>

        {/* After */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.lg, padding: 14, boxShadow: T.shadowSoft }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontFamily: T.fontMono, fontWeight: 700, color: '#047857', letterSpacing: '0.1em' }}>AFTER</span>
            <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.inkFaint }}>4 views · 4 hooks</span>
          </div>
          <Tree/>
        </div>
      </div>

      {/* Data flow */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.r.lg, padding: 16, boxShadow: T.shadowSoft, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: T.fontMono, fontWeight: 700, color: T.inkMuted, letterSpacing: '0.1em', marginBottom: 10 }}>DATA FLOW</div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, fontSize: 11, fontFamily: T.fontMono }}>
          <Node label="User" sub="input · voice" color="#c96442"/>
          <Arrow/>
          <Node label="useCoachThread" sub="messages · reducer" color="#1d4ed8"/>
          <Arrow/>
          <Node label="coach-chat-client" sub="postCoachChat" color="#0f172a" ghost/>
          <Arrow/>
          <Node label="useCoachTts" sub="stream → audio" color="#047857"/>
          <Arrow/>
          <Node label="ThreadView" sub="bubble · EQ halo" color="#b45309"/>
        </div>
      </div>

      {/* Impact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { k: 'LOC', v: '1,800 → ~520', delta: '-71%' },
          { k: 'useRef', v: '23 → 6', delta: '-74%' },
          { k: 'useEffect', v: '12 → 4', delta: '-66%' },
          { k: 'Bundle', v: '72KB → 28KB + lazy', delta: '-61%' },
        ].map(i => (
          <div key={i.k} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: T.r.md, padding: '10px 12px', boxShadow: T.shadowSoft,
          }}>
            <div style={{ fontSize: 9, fontFamily: T.fontMono, fontWeight: 700, color: T.inkMuted, letterSpacing: '0.1em' }}>{i.k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{i.v}</div>
            <div style={{ fontSize: 10, fontFamily: T.fontMono, color: '#047857', fontWeight: 600, marginTop: 2 }}>{i.delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tree() {
  const T = window.ChatTokens;
  const items = [
    { t: 'views/', kind: 'dir', size: '' },
    { t: '  ChatPanel.tsx',     kind: 'file', size: '82 L', note: '루트 · 레이아웃' },
    { t: '  AtriumView.tsx',    kind: 'file', size: '64 L', note: '첫 진입 · 코치 선택' },
    { t: '  ThreadView.tsx',    kind: 'file', size: '112 L', note: '메시지 스트림' },
    { t: '  Composer.tsx',      kind: 'file', size: '58 L', note: '입력 + 빠른칩' },
    { t: 'hooks/', kind: 'dir', size: '' },
    { t: '  useCoachThread.ts', kind: 'hook', size: '95 L', note: 'messages reducer' },
    { t: '  useCoachTts.ts',    kind: 'hook', size: '74 L', note: '스트림 TTS 파이프' },
    { t: '  useVoiceSession.ts',kind: 'hook', size: '62 L', note: 'STT · VAD · mic' },
    { t: '  useAtriumBootstrap.ts', kind: 'hook', size: '38 L', note: 'opening · chips' },
  ];
  return (
    <div style={{ fontFamily: T.fontMono, fontSize: 10.5, lineHeight: 1.55, color: T.ink }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '1px 0' }}>
          <span style={{
            color: it.kind === 'dir' ? '#c96442' : it.kind === 'hook' ? '#1d4ed8' : T.ink,
            fontWeight: it.kind === 'dir' ? 700 : 500, whiteSpace: 'pre',
            minWidth: 148,
          }}>{it.t}</span>
          {it.size && <span style={{ color: T.inkFaint, fontSize: 9 }}>{it.size}</span>}
          {it.note && <span style={{ color: T.inkMuted, fontSize: 9.5, marginLeft: 'auto', fontFamily: T.font }}>{it.note}</span>}
        </div>
      ))}
    </div>
  );
}

function Node({ label, sub, color, ghost }) {
  const T = window.ChatTokens;
  return (
    <div style={{
      flex: 1, padding: '8px 10px',
      border: `1px solid ${ghost ? T.border : color + '55'}`,
      background: ghost ? T.surfaceMuted : color + '10',
      borderRadius: 8, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ fontSize: 9, color: T.inkMuted, marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(15,23,42,0.3)' }}>
      <svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5h15m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

Object.assign(window, { RefactorDiagram });
