"use client";

/**
 * MealTimeline · P1-4 정보 위계 재정리
 * ─────────────────────────────────────
 * 기존 문제 (리뷰 v1 P1-4):
 *   - 카드 안에 [badge][kcal 숫자][시각] 이 같은 행에 평등하게 배치되어
 *     시선이 가장 중요한 "kcal" 로 바로 가지 않음.
 *   - 3 macro pill 이 primary/scanner/amber 세 색으로 동시 발광 → 카드 내부 시각 경쟁.
 *   - "음식 N품 상세 보기" 버튼이 card 내부에서 tertiary 위치인데 primary 색.
 *   - 빈 타임라인 메시지가 회색 + 오류 톤.
 *
 * 개선 원칙:
 *   1. 카드 안 정보 위계 = hero(kcal) > title(이름) > meta(슬롯·시각·매크로)
 *   2. macro pill 색 경쟁 해소 — 3개 모두 중립 chip, 숫자만 톤 구분
 *   3. 상세 보기 버튼 → tone="ghost" + chevron 우측정렬, 색 발광 제거
 *   4. 빈 상태 → EmptyState 컴포넌트로 교체 (variant="timeline")
 *   5. 카피 톤 정돈 — "검거 로그가 비어 있어요" → "기록 대기 중"
 */

import Image from "next/image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, X } from "lucide-react";
import type { Meal } from "@/types/database";
import { cn } from "@/lib/utils";
import { foodEmojiForName } from "@/lib/food-emoji";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MEAL_SLOT_IDS,
  MEAL_SLOT_SECTION,
  isLateNightSlot,
  mealSlotDropReassuranceLabel,
  type MealSlot,
} from "@/lib/meal-slots";
import { formatMacroGrams, formatMealItemKcal } from "@/lib/meal-macros";
import { traysIntoBuckets, sumTrayCal, slotForTray } from "@/lib/meal-tray";

interface MealTimelineProps {
  meals: Meal[];
  selectedDateYmd: string;
  onDeleteMealGroup?: (mealGroupId: string) => void;
  onMoveTrayToSlot?: (
    mealGroupId: string,
    toSlot: MealSlot,
    fromSlot: MealSlot
  ) => void;
  isDeletingGroupId?: string | null;
  isMovingTray?: boolean;
  /** P1-4 추가: 빈 상태에서 CTA 연결용 */
  onOpenCamera?: () => void;
  onOpenManualInput?: () => void;
}

function DraggableTray({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (handle: {
    listeners: DraggableSyntheticListeners;
    attributes: DraggableAttributes;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, disabled: Boolean(disabled) });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10")}>
      {children({ listeners, attributes })}
    </div>
  );
}

function MealSlotSurface({
  slot,
  isEmpty,
  isDragActive,
  dndEnabled,
  selectedDateYmd,
  children,
}: {
  slot: MealSlot;
  isEmpty: boolean;
  isDragActive: boolean;
  dndEnabled: boolean;
  selectedDateYmd: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot:${slot}`,
    disabled: !dndEnabled,
  });
  const meta = MEAL_SLOT_SECTION[slot];

  if (isEmpty && dndEnabled) {
    const reassurance = mealSlotDropReassuranceLabel(slot, selectedDateYmd);
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col items-center justify-center overflow-hidden rounded-row border-2 border-dashed transition-all duration-300 ease-in-out",
          isOver
            ? "min-h-[10rem] border-indigo-500 bg-indigo-500/10 py-3 dark:border-indigo-400 dark:bg-indigo-400/12"
            : cn(
                "h-12 min-h-[3rem] border-muted-foreground/20 bg-transparent dark:border-white/12",
                isDragActive &&
                  "border-primary/40 bg-primary/[0.07] opacity-[0.92] ring-1 ring-primary/30 dark:border-primary/45 dark:ring-primary/25"
              )
        )}
      >
        {isOver ? (
          <>
            <span className="animate-pulse text-sm font-bold text-indigo-600 dark:text-indigo-300">
              여기에 놓기
            </span>
            <span className="mt-2 max-w-[17rem] px-2 text-center text-[10px] leading-snug text-indigo-800/90 dark:text-indigo-200/90">
              {reassurance}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="text-base leading-none" aria-hidden>
              {meta.emoji}
            </span>
            {meta.title} · 기록 없음
          </span>
        )}
      </div>
    );
  }

  if (isEmpty && !dndEnabled) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex h-12 min-h-[3rem] items-center justify-center rounded-row border-2 border-dashed border-muted-foreground/15 px-3 dark:border-white/10"
        )}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="text-base leading-none" aria-hidden>
            {meta.emoji}
          </span>
          기록 없음
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-row transition-[box-shadow,background-color,min-height] duration-300 ease-in-out",
        isOver &&
          "bg-primary/8 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}
    >
      {children}
    </div>
  );
}

function MealTrayStrip({
  slot,
  trays,
  renderTray,
}: {
  slot: MealSlot;
  trays: Meal[][];
  renderTray: (tray: Meal[], slot: MealSlot) => ReactNode;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [dotIdx, setDotIdx] = useState(0);
  const multi = trays.length > 1;

  const updateDot = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-tray-slide]");
    if (items.length === 0) return;
    const rootRect = root.getBoundingClientRect();
    const center = rootRect.left + rootRect.width / 2;
    let best = 0;
    let bestDelta = Infinity;
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < bestDelta) { bestDelta = d; best = i; }
    });
    setDotIdx(best);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    updateDot();
    root.addEventListener("scroll", updateDot, { passive: true });
    window.addEventListener("resize", updateDot);
    return () => {
      root.removeEventListener("scroll", updateDot);
      window.removeEventListener("resize", updateDot);
    };
  }, [trays.length, updateDot]);

  return (
    <div className="space-y-2">
      <ul
        ref={scrollerRef}
        style={{ WebkitOverflowScrolling: "touch" }}
        className={cn(
          "flex list-none gap-3 overflow-x-auto overscroll-x-contain pb-1 pl-0.5 pr-2 scrollbar-hide",
          "snap-x snap-mandatory scroll-pl-1 touch-pan-x sm:scroll-pl-0.5",
          multi ? "pt-0.5" : ""
        )}
        role="list"
      >
        {trays.map((tray) => (
          <li
            key={tray[0]?.meal_group_id ?? tray[0]?.id}
            data-tray-slide
            className={cn(
              "snap-center shrink-0",
              multi
                ? "w-[min(86vw,15.85rem)] sm:w-[15.25rem]"
                : "w-full min-w-0 max-w-[20rem]"
            )}
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(multi && "max-sm:origin-top max-sm:scale-[0.98]")}
            >
              {renderTray(tray, slot)}
            </motion.div>
          </li>
        ))}
      </ul>
      {multi ? (
        <div className="flex flex-col items-center gap-1 px-1">
          <div className="flex items-center gap-2" role="tablist" aria-label={`${MEAL_SLOT_SECTION[slot].title} 슬롯 기록 선택`}>
            {trays.map((tray, i) => (
              <button
                key={tray[0]?.meal_group_id ?? `tab-${i}`}
                type="button"
                role="tab"
                aria-selected={i === dotIdx}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  i === dotIdx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => {
                  const root = scrollerRef.current;
                  const slide = root?.querySelectorAll<HTMLElement>("[data-tray-slide]")[i];
                  slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function MealTimeline({
  meals,
  selectedDateYmd,
  onDeleteMealGroup,
  onMoveTrayToSlot,
  isDeletingGroupId,
  isMovingTray,
  onOpenCamera,
  onOpenManualInput,
}: MealTimelineProps) {
  const dndEnabled = Boolean(onMoveTrayToSlot);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 240, tolerance: 10 } })
  );

  const buckets = useMemo(() => traysIntoBuckets(meals), [meals]);
  const [trayFoodDetailOpen, setTrayFoodDetailOpen] = useState<Record<string, boolean>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFromSlot, setActiveFromSlot] = useState<MealSlot | null>(null);
  const fromSlotRef = useRef<MealSlot | null>(null);

  const activeTray = useMemo(() => {
    if (!activeId) return null;
    const gid = activeId.replace(/^tray:/, "");
    for (const slot of MEAL_SLOT_IDS) {
      for (const tray of buckets[slot]) {
        if (tray[0]?.meal_group_id === gid) return tray;
      }
    }
    return null;
  }, [activeId, buckets]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    const gid = id.replace(/^tray:/, "");
    for (const slot of MEAL_SLOT_IDS) {
      for (const tray of buckets[slot]) {
        if (tray[0]?.meal_group_id === gid) {
          fromSlotRef.current = slot;
          setActiveFromSlot(slot);
          return;
        }
      }
    }
    fromSlotRef.current = null;
    setActiveFromSlot(null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    setActiveFromSlot(null);
    const { active, over } = e;
    if (!over || !onMoveTrayToSlot) return;
    const trayKey = String(active.id);
    const overKey = String(over.id);
    if (!trayKey.startsWith("tray:") || !overKey.startsWith("slot:")) return;
    const mealGroupId = trayKey.slice("tray:".length);
    const toSlot = overKey.slice("slot:".length) as MealSlot;
    const from = fromSlotRef.current;
    fromSlotRef.current = null;
    if (!from || from === toSlot) return;
    onMoveTrayToSlot(mealGroupId, toSlot, from);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveFromSlot(null);
    fromSlotRef.current = null;
  };

  /* ─── P1-3 · 빈 상태 교체 ─── */
  if (meals.length === 0) {
    return (
      <EmptyState
        variant="timeline"
        title="기록 대기 중"
        description="첫 끼니를 촬영하면 타임라인에 즉시 표시됩니다."
        action={onOpenCamera ? { label: "지금 촬영", onClick: onOpenCamera } : undefined}
        secondary={onOpenManualInput ? { label: "직접 입력", onClick: onOpenManualInput } : undefined}
      />
    );
  }

  /* ─── P1-4 · tray card 위계 재정리 ─── */
  const renderTrayCard = (
    tray: Meal[],
    slot: MealSlot,
    { drag }: { drag: boolean }
  ) => {
    const head = tray[0];
    if (!head) return null;
    const groupId = head.meal_group_id;
    const total = sumTrayCal(tray);
    const multi = tray.length > 1;
    const night = isLateNightSlot(slot);
    const busy = isDeletingGroupId === groupId;
    const img = tray.find((m) => m.image_url?.trim())?.image_url ?? null;
    const meta = MEAL_SLOT_SECTION[slot];
    const carbsG = tray.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
    const proteinG = tray.reduce((s, m) => s + (Number(m.protein) || 0), 0);
    const fatG = tray.reduce((s, m) => s + (Number(m.fat) || 0), 0);

    /* 중립 chip 3개 — 배경색 경쟁 해소, 숫자만 톤 약하게 구분 */
    const macroChips = (
      <div
        className="mt-1.5 flex flex-wrap gap-1"
        role="list"
        aria-label="탄·단·지 그램"
      >
        {[
          { k: "탄", v: carbsG, c: "var(--chart-1)" },
          { k: "단", v: proteinG, c: "var(--chart-2)" },
          { k: "지", v: fatG,   c: "var(--chart-3)" },
        ].map(({ k, v, c }) => (
          <span
            key={k}
            role="listitem"
            className="inline-flex items-center gap-0.5 rounded-chip bg-[var(--timeline-chip-bg)] px-1.5 py-0.5 font-data text-[11px] tabular-nums text-[color:var(--timeline-chip-fg)]"
          >
            <span className="font-bold" style={{ color: c }}>{k}</span>
            <span className="font-semibold">{formatMacroGrams(v)}</span>
            <span className="opacity-60">g</span>
          </span>
        ))}
      </div>
    );

    const makeInner = (handleBind?: {
      listeners: DraggableSyntheticListeners;
      attributes: DraggableAttributes;
    }) => (
      <div
        className={cn(
          "relative rounded-row border p-3 pr-10 shadow-sm transition-[box-shadow,border-color]",
          night
            ? "border-red-500/35 bg-card shadow-[0_0_20px_-4px_rgba(239,68,68,0.42)] dark:border-red-400/28 dark:shadow-[0_0_22px_-4px_rgba(248,113,113,0.35)]"
            : "border-border bg-card",
          busy && "pointer-events-none opacity-50"
        )}
      >
        {onDeleteMealGroup ? (
          <Button
            tone="ghost"
            size="icon-sm"
            disabled={busy}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDeleteMealGroup(groupId)}
            className="absolute right-2 top-2 text-muted-foreground/45 hover:bg-destructive/12 hover:text-destructive"
            aria-label="이 끼니 기록 전체 삭제"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </Button>
        ) : null}

        <div className="flex items-start gap-2">
          {dndEnabled ? (
            <div
              className={cn(
                "flex w-3.5 shrink-0 flex-col justify-center self-stretch pt-1",
                handleBind && "cursor-grab touch-none active:cursor-grabbing"
              )}
              {...(handleBind?.listeners ?? {})}
              {...(handleBind?.attributes ?? {})}
              aria-label={handleBind ? "길게 눌러 다른 끼니 슬롯으로 이동" : undefined}
              aria-hidden={handleBind ? undefined : true}
            >
              <div className="mx-auto grid grid-cols-2 gap-[2px] opacity-60">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className="h-[2.5px] w-[2.5px] rounded-full bg-muted-foreground/35 dark:bg-muted-foreground/45" />
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sub bg-muted">
              {img ? (
                <Image src={img} alt="" fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl leading-none">
                  {tray.length === 1 ? foodEmojiForName(tray[0].food_name) : "🍱"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* ─── HERO: kcal 큰 숫자, 같은 행에 meta(배지·시각)는 약하게 ─── */}
              <div className="flex items-baseline gap-2">
                <p className="font-data text-xl font-bold tabular-nums leading-none text-[color:var(--timeline-kcal)]">
                  {total}
                  <span className="ml-0.5 text-[11px] font-semibold text-[color:var(--timeline-meta)]">
                    kcal
                  </span>
                </p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-[color:var(--timeline-meta)]">
                <span
                  className={cn(
                    "rounded-chip px-1.5 py-0.5 text-[9px] font-bold tracking-wide",
                    night ? "bg-red-500/12 text-red-700 dark:text-red-300" : "bg-primary/10 text-primary"
                  )}
                >
                  {meta.badge}
                </span>
                <span>{timeLabel(head.eaten_at)}</span>
              </div>

              {/* TITLE: 음식 이름 */}
              <p className="mt-1.5 truncate text-[13px] font-semibold text-[color:var(--timeline-title)]">
                {multi ? `${meta.title} 식사 · ${tray.length}품` : tray[0].food_name}
              </p>

              {macroChips}

              {multi ? (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTrayFoodDetailOpen((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
                    }}
                    className={cn(
                      "mt-1.5 flex w-full min-w-0 items-center justify-between gap-2 rounded-chip px-1 py-1",
                      "text-[11px] font-medium text-[color:var(--timeline-meta)]",
                      "hover:text-foreground hover:bg-[var(--btn-ghost-hover-bg)] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                    aria-expanded={Boolean(trayFoodDetailOpen[groupId])}
                  >
                    <span className="min-w-0 truncate">
                      {trayFoodDetailOpen[groupId] ? `품목 접기` : `품목 ${tray.length}개 보기`}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200",
                        trayFoodDetailOpen[groupId] && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {trayFoodDetailOpen[groupId] ? (
                      <motion.div
                        key={`food-detail-${groupId}`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <ul className="space-y-0.5 pb-0.5 text-[11px] text-[color:var(--timeline-meta)]">
                          {tray.map((m) => (
                            <li key={m.id} className="break-words pl-0.5 tabular-nums leading-snug">
                              • {m.food_name} <span className="opacity-70">({formatMealItemKcal(m.cal)}kcal)</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );

    if (drag && dndEnabled) {
      return (
        <DraggableTray id={`tray:${groupId}`} disabled={isMovingTray || busy}>
          {({ listeners, attributes }) => makeInner({ listeners, attributes })}
        </DraggableTray>
      );
    }
    return makeInner();
  };

  const isDragActive = dndEnabled && activeId !== null;

  const sections = MEAL_SLOT_IDS.map((slot) => {
    const meta = MEAL_SLOT_SECTION[slot];
    const list = buckets[slot];
    return (
      <motion.div
        key={slot}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-baseline gap-2 px-0.5">
          <span className="text-lg" aria-hidden>{meta.emoji}</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">{meta.title}</p>
            <p className="text-[10px] text-[color:var(--timeline-meta)]">{meta.hint}</p>
          </div>
        </div>

        <MealSlotSurface
          slot={slot}
          isEmpty={list.length === 0}
          isDragActive={isDragActive}
          dndEnabled={dndEnabled}
          selectedDateYmd={selectedDateYmd}
        >
          {list.length === 0 ? null : (
            <MealTrayStrip
              slot={slot}
              trays={list}
              renderTray={(tray) => renderTrayCard(tray, slot, { drag: true })}
            />
          )}
        </MealSlotSurface>
      </motion.div>
    );
  });

  const timelineBody = (
    <div className="space-y-8">
      <AnimatePresence mode="popLayout">{sections}</AnimatePresence>
    </div>
  );

  if (!dndEnabled) return timelineBody;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      {timelineBody}
      <DragOverlay dropAnimation={null}>
        {activeTray && activeTray[0] ? (
          <div className="w-[min(100%,16.25rem)] scale-[1.02] shadow-xl">
            {renderTrayCard(activeTray, activeFromSlot ?? slotForTray(activeTray), { drag: false })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
