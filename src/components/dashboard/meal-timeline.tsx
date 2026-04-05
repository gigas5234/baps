"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
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
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, disabled: Boolean(disabled) });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10")}>
      <div
        {...listeners}
        {...attributes}
        className={cn(
          "touch-none",
          !disabled && "cursor-grab active:cursor-grabbing"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DroppableBucket({
  slot,
  children,
}: {
  slot: MealSlot;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${slot}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[4.5rem] rounded-2xl transition-[box-shadow,background-color]",
        isOver && "bg-primary/8 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
      )}
    >
      {children}
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 py-12 text-muted-foreground">
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

    const inner = (
      <div
        className={cn(
          "relative rounded-2xl border p-3 pr-10 shadow-sm transition-[box-shadow,border-color]",
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
              "absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/12 hover:text-destructive",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="이 끼니 기록 전체 삭제"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}

        <div className="flex items-start gap-3">
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
              <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                {tray.map((m) => (
                  <li key={m.id} className="tabular-nums">
                    • {m.food_name} ({m.cal}kcal)
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-2 font-data text-[11px] font-semibold tabular-nums text-foreground/85">
                <span>탄 {Number(tray[0].carbs)}g</span>
                <span>단 {Number(tray[0].protein)}g</span>
                <span>지 {Number(tray[0].fat)}g</span>
              </div>
            )}
          </div>
        </div>
        {dndEnabled ? (
          <p className="mt-2 text-[9px] text-muted-foreground">
            길게 눌러 다른 끼니 슬롯으로 이동
          </p>
        ) : null}
      </div>
    );

    if (drag && dndEnabled) {
      return (
        <DraggableTray
          id={`tray:${groupId}`}
          disabled={isMovingTray || busy}
        >
          {inner}
        </DraggableTray>
      );
    }
    return inner;
  };

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

        <DroppableBucket slot={slot}>
          {list.length === 0 ? (
            <div
              className={cn(
                "flex min-h-[4.5rem] items-center justify-center rounded-2xl border border-dashed px-3 py-4 text-center text-[11px] text-muted-foreground",
                dndEnabled
                  ? "border-muted-foreground/25 bg-muted/15"
                  : "border-muted-foreground/15"
              )}
            >
              {dndEnabled
                ? "비어 있음 · 다른 슬롯에서 끼니를 끌어다 놓기"
                : "기록 없음"}
            </div>
          ) : (
            <ul className="list-none space-y-2.5 p-0" role="list">
              {list.map((tray) => (
                <motion.li
                  key={tray[0]?.meal_group_id ?? tray[0]?.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {renderTrayCard(tray, slot, { drag: true })}
                </motion.li>
              ))}
            </ul>
          )}
        </DroppableBucket>
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
          <div className="w-[min(100%,20rem)] scale-[1.02] shadow-xl">
            {renderTrayCard(activeTray, activeFromSlot ?? slotForTray(activeTray), {
              drag: false,
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
