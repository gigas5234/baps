"use client";

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
import { UtensilsCrossed, X } from "lucide-react";
import type { Meal } from "@/types/database";
import { cn } from "@/lib/utils";
import { foodEmojiForName } from "@/lib/food-emoji";
import {
  MEAL_SLOT_IDS,
  MEAL_SLOT_SECTION,
  isLateNightSlot,
  mealSlotDropReassuranceLabel,
  type MealSlot,
} from "@/lib/meal-slots";
import { traysIntoBuckets, sumTrayCal, slotForTray } from "@/lib/meal-tray";

interface MealTimelineProps {
  meals: Meal[];
  /** 드롭 시 eaten_at 기본 시각 (YYYY-MM-DD) */
  selectedDateYmd: string;
  onDeleteMealGroup?: (mealGroupId: string) => void;
  onMoveTrayToSlot?: (
    mealGroupId: string,
    toSlot: MealSlot,
    fromSlot: MealSlot
  ) => void;
  isDeletingGroupId?: string | null;
  isMovingTray?: boolean;
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

/** 빈 슬롯은 평소 얇게, 드래그 중·isOver 시 인디고 톤으로 확장 */
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
          "flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out",
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
            {meta.title} 식사 추가
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
          "flex h-12 min-h-[3rem] items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/15 px-3 dark:border-white/10"
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
        "rounded-xl transition-[box-shadow,background-color,min-height] duration-300 ease-in-out",
        isOver &&
          "bg-primary/8 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}
    >
      {children}
    </div>
  );
}

/** 같은 슬롯에 트레이가 여러 개일 때 가로 스냅·인디케이터로 모두 접근 가능하게 */
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
      if (d < bestDelta) {
        bestDelta = d;
        best = i;
      }
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
          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label={`${MEAL_SLOT_SECTION[slot].title} 슬롯 기록 선택`}
          >
            {trays.map((tray, i) => (
              <button
                key={tray[0]?.meal_group_id ?? `tab-${i}`}
                type="button"
                role="tab"
                aria-selected={i === dotIdx}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  i === dotIdx
                    ? "w-6 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                onClick={() => {
                  const root = scrollerRef.current;
                  const slide = root?.querySelectorAll<HTMLElement>(
                    "[data-tray-slide]"
                  )[i];
                  slide?.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
              />
            ))}
          </div>
          <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
            {dotIdx + 1}번째 기록 · 총 {trays.length}개 · 스와이프 또는 점으로 이동
          </p>
        </div>
      ) : null}
    </div>
  );
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MealTimeline({
  meals,
  selectedDateYmd,
  onDeleteMealGroup,
  onMoveTrayToSlot,
  isDeletingGroupId,
  isMovingTray,
}: MealTimelineProps) {
  const dndEnabled = Boolean(onMoveTrayToSlot);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 240, tolerance: 10 },
    })
  );

  const buckets = useMemo(() => traysIntoBuckets(meals), [meals]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFromSlot, setActiveFromSlot] = useState<MealSlot | null>(
    null
  );
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

  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 py-12 text-muted-foreground">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium">검거 로그가 비어 있어요</p>
        <p className="mt-1 text-center text-xs text-muted-foreground/90">
          사진을 찍어 기록하면 타임라인에 표시됩니다
        </p>
      </div>
    );
  }

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

    const macroPills = (
      <div className="mt-1 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "rounded-lg border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-data text-[11px] font-semibold tabular-nums text-primary",
            "dark:border-primary/35 dark:bg-primary/15"
          )}
        >
          탄 {carbsG}g
        </span>
        <span
          className={cn(
            "rounded-lg border border-scanner/35 bg-scanner/10 px-1.5 py-0.5 font-data text-[11px] font-semibold tabular-nums text-scanner",
            "dark:border-scanner/40 dark:bg-scanner/15"
          )}
        >
          단 {proteinG}g
        </span>
        <span
          className={cn(
            "rounded-lg border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-data text-[11px] font-semibold tabular-nums text-amber-800",
            "dark:border-amber-400/40 dark:bg-amber-400/12 dark:text-amber-200"
          )}
        >
          지 {fatG}g
        </span>
      </div>
    );

    const makeInner = (handleBind?: {
      listeners: DraggableSyntheticListeners;
      attributes: DraggableAttributes;
    }) => (
      <div
        className={cn(
          "relative rounded-xl border p-3 pr-10 shadow-sm transition-[box-shadow,border-color]",
          night
            ? "border-red-500/35 bg-card shadow-[0_0_20px_-4px_rgba(239,68,68,0.42)] dark:border-red-400/28 dark:shadow-[0_0_22px_-4px_rgba(248,113,113,0.35)]"
            : "border-border bg-card",
          busy && "pointer-events-none opacity-50"
        )}
      >
        {onDeleteMealGroup ? (
          <button
            type="button"
            disabled={busy}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDeleteMealGroup(groupId)}
            className={cn(
              "absolute right-2 top-2 rounded-xl p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/12 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="이 끼니 기록 전체 삭제"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}

        <div className="flex items-start gap-2">
          {dndEnabled ? (
            <div
              className={cn(
                "flex w-3.5 shrink-0 flex-col justify-center self-stretch pt-1",
                handleBind &&
                  "cursor-grab touch-none active:cursor-grabbing"
              )}
              {...(handleBind?.listeners ?? {})}
              {...(handleBind?.attributes ?? {})}
              aria-label={
                handleBind
                  ? "길게 눌러 다른 끼니 슬롯으로 이동 (왼쪽 점 잡기)"
                  : undefined
              }
              aria-hidden={handleBind ? undefined : true}
            >
              <div className="mx-auto grid grid-cols-2 gap-[2px] opacity-60">
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    className="h-[2.5px] w-[2.5px] rounded-full bg-muted-foreground/35 dark:bg-muted-foreground/45"
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {img ? (
                <Image
                  src={img}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl leading-none">
                  {tray.length === 1
                    ? foodEmojiForName(tray[0].food_name)
                    : "🍱"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide",
                  night
                    ? "bg-red-500/15 text-red-700 dark:text-red-300"
                    : "bg-primary/12 text-primary"
                )}
              >
                {meta.badge}
              </span>
              <p className="font-data text-lg font-bold tabular-nums leading-none text-foreground">
                {total}
                <span className="ml-0.5 text-xs font-semibold text-muted-foreground">
                  kcal
                </span>
              </p>
              <span className="text-[10px] font-medium text-muted-foreground">
                {timeLabel(head.eaten_at)}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground">
              {multi
                ? `${meta.title} 식사 (${tray.length}품)`
                : tray[0].food_name}
            </p>
            {multi ? (
              <>
                {macroPills}
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                  {tray.map((m) => (
                    <li key={m.id} className="tabular-nums">
                      • {m.food_name} ({m.cal}kcal)
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              macroPills
            )}
            </div>
          </div>
        </div>
      </div>
    );

    if (drag && dndEnabled) {
      return (
        <DraggableTray
          id={`tray:${groupId}`}
          disabled={isMovingTray || busy}
        >
          {({ listeners, attributes }) =>
            makeInner({ listeners, attributes })
          }
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
          <span className="text-lg" aria-hidden>
            {meta.emoji}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              {meta.title}
            </p>
            <p className="text-[10px] text-muted-foreground">{meta.hint}</p>
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

  if (!dndEnabled) {
    return timelineBody;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {timelineBody}
      <DragOverlay dropAnimation={null}>
        {activeTray && activeTray[0] ? (
          <div className="w-[min(100%,16.25rem)] scale-[1.02] shadow-xl">
            {renderTrayCard(activeTray, activeFromSlot ?? slotForTray(activeTray), {
              drag: false,
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
