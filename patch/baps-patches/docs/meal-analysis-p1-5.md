# P1-5 · Meal Analysis 마커 UX 개선 — 패치 노트

> 파일: `src/components/meal/analyze-modal.tsx`
>
> 리뷰 v1 에서 지적된 항목들의 **코드 교체 방식이 아닌 diff 가이드**.
> analyze-modal.tsx 는 자주 바뀌는 화면이라 전체 교체 대신, 아래 **6개 포인트만 수정** 하세요.

---

## 왜 diff 만 주는가

원본 파일에 `portion slider`, `EXIF hint`, `multi-item list`, `quick-log variant` 4개 분기가 얽혀 있어서 전체 교체를 하면 충돌 소지가 큽니다. 각 포인트를 **독립적으로** 적용 가능.

---

## 포인트 1 · 헤더 타이틀 → 상태 바지 + 타이틀 2단

**Before**
```tsx
<h2 className="text-lg font-bold">
  {isAnalyzing ? "분석 중..." : result ? (quickLog ? "퀵 메뉴 등록" : "분석 완료!") : "오류"}
</h2>
```

**After — Watcher 톤 + 상태 지표**
```tsx
<div className="flex items-center gap-2">
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 font-data text-[10px] font-bold tracking-wide",
      isAnalyzing
        ? "bg-scanner/12 text-scanner"
        : error
          ? "bg-destructive/12 text-destructive"
          : "bg-chart-2/12 text-chart-2"
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
    {isAnalyzing ? "SCANNING" : error ? "ERROR" : "DECODED"}
  </span>
  <h2 className="text-base font-bold tracking-tight">
    {isAnalyzing ? "식단 해독 중" : result ? (quickLog ? "퀵 메뉴 등록" : "해독 결과") : "분석 실패"}
  </h2>
</div>
```

## 포인트 2 · 타이틀/설명 카피 톤

**Before**
```tsx
<p className="text-xl font-bold">{result.food_name}</p>
<p className="mt-1 text-sm text-muted-foreground">{result.description}</p>
```

**After** — 이름 아래 `▌ FACT` 마커로 설명을 팩트로 취급. 이모지 금지.
```tsx
<p className="text-xl font-bold tracking-tight">{result.food_name}</p>
{result.description ? (
  <p className="mt-1.5 inline-flex items-start gap-1.5 text-sm text-muted-foreground">
    <span className="mt-0.5 inline-block h-3 w-0.5 shrink-0 bg-foreground/50" aria-hidden />
    <span>{result.description}</span>
  </p>
) : null}
```

## 포인트 3 · 끼니 슬롯 선택 — 현재 pill 그리드 → 세그먼트

**Before:** 4개 pill 이 wrap 되어 줄바꿈. 어떤 게 현재 선택인지 한눈에 안 들어옴.

**After**
```tsx
<div className="space-y-1.5">
  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
    끼니 슬롯
  </p>
  <div
    role="radiogroup"
    aria-label="끼니 슬롯 선택"
    className="grid grid-cols-4 gap-0.5 rounded-row bg-muted/50 p-0.5"
  >
    {MEAL_SLOT_IDS.map((id) => {
      const meta = MEAL_SLOT_SECTION[id];
      const on = mealSlot === id;
      return (
        <button
          key={id}
          role="radio"
          aria-checked={on}
          type="button"
          onClick={() => onMealSlotChange(id)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-1.5 text-[10px] font-semibold transition-colors",
            on
              ? "bg-card text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="text-sm leading-none" aria-hidden>{meta.emoji}</span>
          <span>{meta.title}</span>
        </button>
      );
    })}
  </div>
</div>
```

## 포인트 4 · 매크로 4-grid 카드 → 좌측 kcal hero + 우측 매크로 3열

현재는 kcal/탄/단/지 4개가 평등 4분할. **칼로리가 히어로** 가 되어야 함.

**After**
```tsx
<div className="grid grid-cols-[1.2fr_2fr] gap-2 rounded-card border border-grid-line bg-card/50 p-3">
  {/* kcal hero */}
  <div className="flex flex-col items-start justify-center gap-0.5 rounded-sub bg-gauge-caution/8 px-3 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gauge-caution">총 칼로리</p>
    <p className="font-data text-3xl font-bold leading-none text-gauge-caution">{scaled.cal}</p>
    <p className="text-[10px] font-semibold text-muted-foreground">kcal</p>
  </div>

  {/* macro 3 rows */}
  <div className="flex flex-col justify-center gap-1.5">
    {[
      { label: "탄수화물", value: scaled.carbs, color: "var(--chart-1)" },
      { label: "단백질",   value: scaled.protein, color: "var(--chart-2)" },
      { label: "지방",     value: scaled.fat,     color: "var(--chart-3)" },
    ].map((m) => (
      <div key={m.label} className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
        <p className="font-data text-sm font-bold tabular-nums" style={{ color: m.color }}>
          {m.value}<span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">g</span>
        </p>
      </div>
    ))}
  </div>
</div>
```

## 포인트 5 · "자주 먹는 메뉴로 저장" 체크박스 → 토글 스위치

체크박스는 "필수 동의" 느낌. 이 옵션은 상태 플래그라서 **Switch** 가 맞음.

```tsx
import * as Switch from "@base-ui/react/switch";

<label className={cn(
  "flex items-center justify-between gap-3 rounded-sub border border-border bg-muted/25 px-4 py-3 transition-colors",
  multiItem && "pointer-events-none opacity-50"
)}>
  <span className="text-sm leading-snug">
    <span className="block font-semibold text-foreground">자주 먹는 메뉴로 저장</span>
    <span className="mt-0.5 block text-[11px] text-muted-foreground">
      {multiItem
        ? "여러 품목 사진은 자주 먹는 메뉴에 한 번에 등록되지 않습니다."
        : "Quick Log 에 사진 분석 100% 기준이 저장됩니다."}
    </span>
  </span>
  <Switch.Root
    checked={saveAsFrequent && !multiItem}
    onCheckedChange={setSaveAsFrequent}
    disabled={multiItem}
    className="relative h-6 w-10 shrink-0 rounded-full bg-muted data-[checked]:bg-primary"
  >
    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-[18px]" />
  </Switch.Root>
</label>
```

## 포인트 6 · 최종 CTA — 버튼 위계 확정

**Before:** primary 버튼 하나만. 취소/재분석 동선 없음.

**After:** primary + ghost 2개 스택. P1-2 Button tone 체계 사용.
```tsx
<div className="flex items-center gap-2 pt-1">
  <Button tone="ghost" size="lg" className="flex-none" onClick={onClose} disabled={isSaving}>
    취소
  </Button>
  <Button
    tone="primary"
    size="lg"
    className="flex-1"
    onClick={handleConfirm}
    disabled={isSaving || (!quickLog && portionPct <= 0) || scaled.cal <= 0 || (quickLog && multiItem)}
  >
    {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
    {isSaving ? "기록 중" : quickLog ? "퀵 로그 등록" : "오늘 식단에 기록"}
  </Button>
</div>
```

---

## 체크리스트

- [ ] 헤더에 상태 바지 (SCANNING/DECODED/ERROR) 추가
- [ ] description 앞에 `▌ FACT` 마커
- [ ] 슬롯 선택을 pill → 4-col 세그먼트
- [ ] 매크로 그리드를 kcal hero + 3열로 재구성
- [ ] 자주 저장 checkbox → Switch
- [ ] CTA 를 ghost 취소 + primary 기록 2열로
- [ ] `"분석 완료!"`, `"분석 중..."` 등 **!** 와 **...** 전부 제거 (Watcher 톤)
- [ ] `text-red-500` → `text-destructive` (색 토큰 일관성)
