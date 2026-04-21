# BAPS — Chat v2 Refactor Patch Bundle

`src/components/common/chat-fab.tsx` **2,019 LOC · 72KB** 단일 파일을
**10개 파일 · 평균 120 LOC**로 해체하는 리팩터 + 리디자인 번들.

> **전제**: 기존 `@/lib/coach-personas`, `@/lib/chat-coach`, `@/lib/coach-chat-client`,
> `@/lib/coach-stream-tts-pipeline`, `@/lib/chat-azure-stt`, `@/lib/coach-tts-playback`,
> `@/lib/chat-audio-unlock`, `@/lib/coach-chat-time`, `@/components/common/coach-typewriter`,
> `@/components/common/kakao-coach-bubbles`(formatInlineBold만 재사용) 는 **유지**.

---

## 파일 구성

```
src/
 ├─ lib/
 │   └─ chat-tokens.ts                ⟵ NEW · 코치 hue · CSS var · halo shadow
 ├─ app/
 │   └─ globals.chat.patch.css        ⟵ MERGE · @keyframes 3개
 └─ components/
     ├─ common/
     │   └─ chat-fab.tsx              ⟵ REPLACE · 72KB → 2KB (thin wrapper)
     └─ chat/                         ⟵ NEW FOLDER
         ├─ chat-panel.tsx            ⟵ 루트 레이아웃 + mode 스위칭 (≈ 170 L)
         ├─ atrium-view.tsx           ⟵ 첫 진입 2×3 그리드 (≈ 140 L)
         ├─ thread-view.tsx           ⟵ 메시지 스트림 (≈ 160 L)
         ├─ turn-card.tsx             ⟵ ANALYSIS/ROAST/MISSION 통합 (≈ 110 L)
         ├─ composer.tsx              ⟵ 입력 + chips + voice/send (≈ 100 L)
         ├─ use-coach-thread.ts       ⟵ messages reducer (≈ 150 L)
         ├─ use-coach-tts.ts          ⟵ streaming TTS (≈ 110 L)
         ├─ use-voice-session.ts      ⟵ STT + VAD (≈ 80 L)
         └─ use-atrium-bootstrap.ts   ⟵ opening + quick chips (≈ 90 L)
```

---

## 적용 순서 (3일 MVP · 1주 정식)

### D1 · Tokens + 훅 레이어

1. `src/lib/chat-tokens.ts` **신규 추가**
2. `src/app/globals.css` 하단에 `globals.chat.patch.css` 블록 **머지**
3. `src/components/chat/` 폴더 아래 **훅 4개** (`use-*.ts`) 신규 추가
4. `pnpm tsc --noEmit` 녹색 확인

### D2 · View 레이어

5. `src/components/chat/{atrium,thread,turn-card,composer,chat-panel}.tsx` **신규**
6. `src/components/common/chat-fab.tsx` **교체** (기존 2,019 LOC → 76 LOC)
7. 홈/대시보드에서 `<ChatFab ... />` import 경로 그대로 (파일 위치 동일)

### D3 · QA + 리그레션

- [ ] FAB 탭 → Atrium 진입 · 2×3 카드 렌더 확인
- [ ] 코치 선택 → Roster 상세 패널 + "시작하기" → Thread
- [ ] 메시지 전송 → ANALYSIS/ROAST/MISSION 중 실존 블록만 렌더
- [ ] 스트리밍 버블 halo + EQ 바 · TTS 음소거 토글 정상
- [ ] 음성 버튼 → VAD 4초 idle에 자동 종료
- [ ] localStorage `baps.chat.atriumOnboardingDone=1` 이후 바로 Thread 진입

### D4–5 · Tablet 2-pane (선택)

- `chat-fab.tsx`의 `motion.section` 에 이미 `lg:w-[900px]` 포함. Tablet 레일은
  `chat-panel.tsx`에서 `useMediaQuery("(min-width: 900px)")`로 분기해 좌측 280px
  rail 추가(향후 `coach-rail.tsx` 별도 파일로 분리 권장).

### D6 · 접근성 전수 검사

- 모든 버튼에 `aria-label` · `aria-pressed` 확인 (이미 패치 포함)
- 카드 텍스트 대비 — hue.ink on hue.soft 는 AA 4.5:1 확보 (계산값 첨부)

---

## 제거되는 것

| 파일/심볼 | 대체 |
|-----------|------|
| `AtriumCoachTapDeck` (chat-fab.tsx) | `atrium-view.tsx` |
| `CoachPersonaPicker` (chat-fab.tsx) | `atrium-view.tsx` |
| `QuickChipRow` (chat-fab.tsx) | `composer.tsx` |
| `CoachDataCardView` (chat-fab.tsx) | (다음 스프린트) `data-card.tsx` |
| `KakaoStrategicTurnView` | `turn-card.tsx` (카톡 꼬리/아바타 제거) |
| `VoiceSessionHudFrame` | `composer.tsx` inline mic 상태 |
| `ChatTtsMonitorToggle` | `chat-panel.tsx` 헤더 TTS pill |
| 모듈 레벨 `coachTtsModPromise` 캐시 | `use-coach-tts.ts` 내부 `modCache` |
| `coachTtsAudioUnlockRef` 등 ref 7개 | `use-coach-tts.ts` 내부 1개 |

---

## Hook/Ref 감소 측정

| 지표 | Before | After | Δ |
|------|-------:|------:|---|
| 총 LOC (chat 관련) | 1,800+ | ≈ 1,100 | **−39%** |
| `chat-fab.tsx` 단일 LOC | 2,019 | 76 | **−96%** |
| `useState` | 19 | 훅 내 7 + 패널 4 | **−42%** |
| `useRef` | 25 | 훅 내 5 + 패널 1 | **−76%** |
| `useEffect` | 15 | 훅 내 4 + 패널 2 | **−60%** |

---

## KPI (측정 가능한 효과)

| 지표 | 목표 |
|------|-----:|
| 첫 메시지까지 시간 | ≤ 8s |
| 세션당 코치 전환 | 1.5회 |
| TTS 청취 완료율 | ≥ 70% |
| a11y 대비 실패 | 0건 |
| chat 관련 번들 (gzip) | 28KB + lazy TTS |

---

## 남은 TODO (다음 스프린트)

- `data-card.tsx` 분리 (CoachDataCardView 이식)
- `coach-rail.tsx` — Tablet 좌측 상시 rail
- `useCoachStream` — streamDelimited preview 로직 훅화 (현재 훅 내부 단순화만 적용)
- 다크모드 hue/soft 대비 재검증 (dark에서 soft가 너무 어두움 가능)
