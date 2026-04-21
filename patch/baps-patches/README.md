# BAPS — Design Review Patch Bundle

Design Review v1 에서 도출된 개선안의 코드 패치입니다.
GitHub 저장소 `gigas5234/baps@main` 기준.

> **적용 순서 권장:** P0 → P1. 각 단계 내부 파일들은 서로 독립이라 순서 무관.

---

## P0 · 3건 (CRITICAL)

## 적용 방법

1. `src/components/dashboard/calorie-gauge.tsx` 를 이 폴더의 동명 파일로 **교체**
2. `src/app/globals.css` 의 `:root { … }` / `.dark { … }` / `@utility font-data` 블록을 `src/app/globals.patch.css` 의 변경점으로 **머지**
3. `docs/copy.md` 를 **신규 추가**. 문서 내 카피 재작성 테이블에 맞춰 다음 파일의 문자열도 함께 교체:
   - `src/components/home/home-landing.tsx` (서브헤드, 피치 본문)
   - `src/components/dashboard/daily-quip-banner.tsx` (하드코딩 문자열)
   - `src/components/meal/meal-analysis-result.tsx` (Fact alert 문구)

## 변경 요약

### P0-1 · 게이지 카드 리팩터 (`calorie-gauge.tsx`)
- 3링 (탄·단·지) + 중앙 kcal → **1링 (칼로리) + 하단 수평 매크로 라인**
- 달성률 · 남은 kcal 듀얼 지표 블록 → **progress bar 1줄 아래에 통합**
- live signal 문구 → **`<details>` 접힌 영역으로 이동**
- 측면 매크로 readout (좌/우 2개씩) → **제거**, 하단 MacroRow 로 대체
- `aria-label` / `role="group"` 추가

### P0-2 · 접근성 색 대비 (`globals.patch.css`)
| 토큰 | Before | After | 비고 |
|------|--------|-------|------|
| `--muted-foreground` (light) | `#64748b` (4.5:1 미달) | `#475569` | slate-500 → slate-600 |
| `--gauge-caution` / `--chart-3` (light) | `#ea580c` (3.1:1) | `#c2410c` | 5.2:1 |
| `--alert` / `--destructive` (light) | `#f43f5e` | `#e11d48` | 5.0:1 |
| `--muted-foreground` (dark) | `#94a3b8` | `#cbd5e1` | 7.2:1 |
| `@utility font-data` | tabular-nums 만 | + `"tnum" "lnum"` + letter-spacing | 구형 fallback |

### P0-3 · 카피 톤 고침 (`docs/copy.md`)
- 금지어 5개 + 대체어 명시
- 랜딩 · 대시보드 · Fact Alert 재작성 테이블
- LLM 프리앰블 (자동화 파이프라인용)

---

## P1 · 5건 (HIGH)

| ID | 파일 | 요지 |
|----|------|------|
| P1-1 | `src/app/globals.p1.patch.css` | radius 스케일 6단(`chip/row/sub/card/hero/pill`) 토큰화 + 유틸 |
| P1-2 | `src/components/ui/button.tsx`  | `variant` → `tone` (primary/outline/ghost/alert/link), 사이즈 스케일 재정렬, dev 경고 |
| P1-3 | `src/components/ui/empty-state.tsx` | **신규** 공용 컴포넌트. timeline/meals/insights/generic 4종 variant |
| P1-4 | `src/components/dashboard/meal-timeline.tsx` | 카드 내부 3단 위계(kcal > title > meta), 매크로 chip 경쟁 해소, ghost 상세 버튼, 빈 상태 = EmptyState |
| P1-5 | `docs/meal-analysis-p1-5.md` | AnalyzeModal 6개 포인트 수동 diff 가이드 (전체 교체 대신) |

### 적용 방법

1. `globals.p1.patch.css` 의 `:root` / `.dark` 블록을 `globals.css` 에 **머지**. `@utility rounded-*` 블록 4개도 복사.
2. `button.tsx` **교체** → 호출부에서 `variant=` → `tone=` 일괄 치환:
   - `variant="default"`     → `tone="primary"`
   - `variant="secondary"`   → `tone="outline"`
   - `variant="destructive"` → `tone="alert"`
   - `variant="outline"` / `ghost` / `link` → 그대로 (`variant` 만 `tone` 으로)
3. `empty-state.tsx` **신규 추가**
4. `meal-timeline.tsx` **교체**. `HomeDashboard` 부모에서 `onOpenCamera`, `onOpenManualInput` props 전달 권장.
5. `docs/meal-analysis-p1-5.md` 의 6개 포인트를 `analyze-modal.tsx` 에 **수동 적용**.

### P1 마이그레이션 주의

- `Button` 의 `variant` 를 사용 중인 **모든** 파일에서 `tone` 으로 바꿔야 타입에러 없음. 검색: `grep -rn 'variant="\(default\|secondary\|destructive\|outline\|ghost\|link\)"' src/`
- `rounded-xl` / `rounded-2xl` / `rounded-3xl` 하드코드를 점진적으로 `rounded-row/sub/card/hero` 로 교체. 이번 스프린트에서 전체 치환은 강제하지 않음 — **신규/수정 컴포넌트만** 의미 유틸 사용.
- `meal-timeline.tsx` 는 `@/components/ui/button` 과 `@/components/ui/empty-state` 를 import. 두 파일이 **먼저** 추가되어야 함.

---

## 수동 확인 체크리스트

### P0
- [ ] 게이지 카드 렌더 확인 — 숫자가 링 안쪽 중앙에 위치
- [ ] Lighthouse accessibility > 95 유지
- [ ] `grep -r "완벽한\|좋아요!\|맛있게"` → 0 매치
- [ ] 다크 모드에서 주황 링(지방)이 과채도(#fb923c) 로 보이지 않는지

### P1
- [ ] `grep -rn 'variant="default"' src/components` → 0 매치 (전부 tone 으로 전환)
- [ ] 한 화면에 `tone="primary"` 버튼이 1개 이하
- [ ] Timeline 카드에서 kcal 숫자가 음식 이름보다 시각적으로 먼저 읽힘
- [ ] 빈 상태가 `EmptyState` 로 통일 (timeline, meals, insights)
- [ ] Meal Analysis 모달에서 !/... 문장부호 제거, SCANNING/DECODED 배지 노출
