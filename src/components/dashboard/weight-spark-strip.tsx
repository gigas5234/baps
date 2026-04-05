"use client";

import { useEffect, useState } from "react";
import {
  lastNWeightEntries,
  upsertWeightEntry,
  type WeightEntry,
} from "@/lib/weight-local-storage";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { getLocalYmd } from "@/lib/local-date";

interface WeightSparkStripProps {
  userId: string | undefined;
  selectedDate: string;
  profileKg: number | null | undefined;
  onSavedProfile?: () => void;
}

export function WeightSparkStrip({
  userId,
  selectedDate,
  profileKg,
  onSavedProfile,
}: WeightSparkStripProps) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEntries(lastNWeightEntries(14));
  }, [selectedDate]);

  const last7 = entries.slice(-7);
  const pts =
    last7.length > 0
      ? last7.map((e, i) => {
          const min = Math.min(...last7.map((x) => x.kg));
          const max = Math.max(...last7.map((x) => x.kg));
          const range = Math.max(max - min, 0.1);
          const x = (i / Math.max(last7.length - 1, 1)) * 100;
          const y = 100 - ((e.kg - min) / range) * 100;
          return { x, y };
        })
      : [];

  const pathD =
    pts.length > 1
      ? pts
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
          .join(" ")
      : "";

  const handleSave = async () => {
    const kg = parseFloat(input.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return;
    setSaving(true);
    try {
      const next = upsertWeightEntry(selectedDate, kg);
      setEntries(next);
      setInput("");
      if (userId) {
        const supabase = createClient();
        await supabase.from("profiles").update({ weight: kg }).eq("id", userId);
        onSavedProfile?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const isToday = selectedDate === getLocalYmd();

  return (
    <section
      className={cn(
        "mx-4 rounded-2xl border border-border/60 bg-background/50 px-3 py-3",
        "shadow-sm backdrop-blur-md dark:bg-background/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">체중</h3>
        {profileKg != null ? (
          <span className="text-xs text-muted-foreground">
            프로필 {profileKg}kg
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        기기에 최근 기록을 저장해요. {isToday ? "오늘" : "선택한 날"} 체중을 넣으면
        프로필 몸무게도 같이 맞춰요.
      </p>

      <div className="mt-2 flex h-14 items-end">
        {pts.length > 1 ? (
          <svg
            className="h-full w-full text-primary"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="text-primary/80"
            />
          </svg>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/40 text-[11px] text-muted-foreground">
            기록이 쌓이면 7일 추이 선이 그려져요
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={isToday ? "오늘 체중 (kg)" : `${selectedDate} 체중`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border bg-background/80 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving || !input}
          onClick={handleSave}
          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {saving ? "…" : "저장"}
        </button>
      </div>
    </section>
  );
}
