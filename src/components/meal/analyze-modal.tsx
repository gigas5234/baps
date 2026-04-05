"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  PortionPctSlider,
  type PortionPct,
} from "@/components/meal/portion-pct-slider";
import {
  MEAL_SLOT_IDS,
  MEAL_SLOT_SECTION,
  type MealSlot,
} from "@/lib/meal-slots";

function scaleCal(base: number, pct: PortionPct) {
  return Math.round((base * pct) / 100);
}
function scaleMacro(base: number, pct: PortionPct) {
  return Math.round((base * pct) / 100 * 10) / 10;
}

export interface AnalyzeMealItemRow {
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface AnalyzeModalShape {
  items: AnalyzeMealItemRow[];
  food_name: string;
  description: string;
}

export type AnalyzeModalVariant = "full" | "quick_log_template";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  previewUrl: string | null;
  result: AnalyzeModalShape | null;
  isAnalyzing: boolean;
  error: string | null;
  /** EXIF 등 — 슬롯 제안 문구 */
  exifHint?: string | null;
  mealSlot: MealSlot;
  onMealSlotChange: (slot: MealSlot) => void;
  onConfirm: (options: {
    saveAsFrequent: boolean;
    portionPct: PortionPct;
    priceWon: number | null;
    mealSlot: MealSlot;
    /** 사진만으로 자주 먹는 메뉴만 등록(오늘 식단 미추가) */
    frequentTemplateOnly?: boolean;
  }) => void | Promise<void>;
  isSaving: boolean;
  /** 퀵 로그 전용: 끼니·분량·자주저장 체크 UI 생략, 사진 추정 100% 기준으로만 등록 */
  variant?: AnalyzeModalVariant;
}

export function AnalyzeModal({
  isOpen,
  onClose,
  previewUrl,
  result,
  isAnalyzing,
  error,
  exifHint,
  mealSlot,
  onMealSlotChange,
  onConfirm,
  isSaving,
  variant = "full",
}: AnalyzeModalProps) {
  const quickLog = variant === "quick_log_template";
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [portionPct, setPortionPct] = useState<PortionPct>(100);
  const [priceWonInput, setPriceWonInput] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSaveAsFrequent(quickLog);
      setPortionPct(100);
      setPriceWonInput("");
    }
  }, [isOpen, result?.food_name, quickLog]);

  const multiItem = (result?.items.length ?? 0) > 1;

  const baseTotals = useMemo(() => {
    if (!result?.items.length) {
      return { cal: 0, carbs: 0, protein: 0, fat: 0 };
    }
    return result.items.reduce(
      (acc, i) => ({
        cal: acc.cal + i.cal,
        carbs: acc.carbs + i.carbs,
        protein: acc.protein + i.protein,
        fat: acc.fat + i.fat,
      }),
      { cal: 0, carbs: 0, protein: 0, fat: 0 }
    );
  }, [result]);

  const scaled = result
    ? {
        cal: scaleCal(baseTotals.cal, portionPct),
        carbs: scaleMacro(baseTotals.carbs, portionPct),
        protein: scaleMacro(baseTotals.protein, portionPct),
        fat: scaleMacro(baseTotals.fat, portionPct),
      }
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center overscroll-none bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="max-h-[min(92dvh,100%)] w-full max-w-md space-y-5 overflow-y-auto overscroll-contain rounded-t-3xl bg-background p-6 pb-8 touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isAnalyzing
                  ? "분석 중..."
                  : result
                    ? quickLog
                      ? "퀵 메뉴 등록"
                      : "분석 완료!"
                    : "오류"}
              </h2>
              <button type="button" onClick={onClose} disabled={isSaving}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {previewUrl ? (
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
                <Image
                  src={previewUrl}
                  alt="촬영한 음식"
                  fill
                  className="object-cover"
                />
                {isAnalyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            ) : null}

            {result && scaled ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xl font-bold">{result.food_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.description}
                  </p>
                </div>

                {!quickLog && exifHint ? (
                  <p className="rounded-xl border border-primary/25 bg-primary/8 px-3 py-2 text-center text-[11px] leading-snug text-foreground">
                    {exifHint}
                  </p>
                ) : null}

                {!quickLog ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground">
                      언제 먹은 끼니인가요?
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {MEAL_SLOT_IDS.map((id) => {
                        const meta = MEAL_SLOT_SECTION[id];
                        const on = mealSlot === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onMealSlotChange(id)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors",
                              on
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-muted/40 text-muted-foreground"
                            )}
                          >
                            {meta.emoji} {meta.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {result.items.length > 1 ? (
                  <ul className="space-y-1 rounded-xl border border-border bg-card/40 px-3 py-2 text-left text-[11px]">
                    {result.items.map((it, idx) => (
                      <li key={`${it.food_name}-${idx}`} className="tabular-nums">
                        <span className="font-medium text-foreground">
                          • {it.food_name}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          ({scaleCal(it.cal, portionPct)}kcal · 탄{" "}
                          {scaleMacro(it.carbs, portionPct)}g)
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {!quickLog ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        얼마나 드셨나요?
                      </span>
                      <span className="font-data text-sm font-semibold text-scanner">
                        {portionPct}%
                      </span>
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground dark:text-foreground/65">
                      0~100% · 사진 추정 분량을 100%로 둔 뒤 조절.{" "}
                      <strong className="text-foreground">자주 먹는 저장</strong>
                      은 항목이 1개일 때만 가능해요.
                    </p>
                    <PortionPctSlider
                      value={portionPct}
                      onChange={setPortionPct}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    사진에서 추정한 <strong className="text-foreground">1회 분량(100%)</strong>이
                    퀵 로그에 저장돼요. 나중에 원탭 기록 시 그대로 쓰입니다.
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground dark:text-foreground/65">
                  {quickLog ? "저장 기준 · " : "추정 합계(100%): "}
                  <span className="font-data">
                    {baseTotals.cal}kcal · 탄 {baseTotals.carbs}g · 단{" "}
                    {baseTotals.protein}g · 지 {baseTotals.fat}g
                  </span>
                </p>

                <div className="grid grid-cols-4 gap-2 rounded-2xl border border-grid-line bg-card/50 p-2">
                  {[
                    {
                      label: "칼로리",
                      value: `${scaled.cal}`,
                      unit: "kcal",
                      color: "text-gauge-caution",
                    },
                    {
                      label: "탄수화물",
                      value: `${scaled.carbs}`,
                      unit: "g",
                      color: "text-primary",
                    },
                    {
                      label: "단백질",
                      value: `${scaled.protein}`,
                      unit: "g",
                      color: "text-scanner",
                    },
                    {
                      label: "지방",
                      value: `${scaled.fat}`,
                      unit: "g",
                      color: "text-amber-600 dark:text-amber-400",
                    },
                  ].map(({ label, value, unit, color }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-grid-line bg-background/60 p-3 text-center"
                    >
                      <p
                        className={cn("font-data text-lg font-bold", color)}
                      >
                        {value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {unit}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                {!quickLog ? (
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      multiItem && "pointer-events-none opacity-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={saveAsFrequent && !multiItem}
                      onChange={(e) => setSaveAsFrequent(e.target.checked)}
                      disabled={multiItem}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm leading-snug">
                      <span className="font-medium text-foreground">
                        자주 먹는 메뉴로 저장
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {multiItem
                          ? "여러 품목 사진은 자주 먹는 메뉴에 한 번에 넣지 않아요."
                          : "Quick Log에는 사진 분석 100% 기준이 저장돼요."}
                      </span>
                    </span>
                  </label>
                ) : null}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">식비(원, 선택)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="가성비 코치용 — 이번 끼에 쓴 돈"
                    value={priceWonInput}
                    onChange={(e) => setPriceWonInput(e.target.value)}
                    className="font-data w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {quickLog && multiItem ? (
                  <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-center text-[11px] leading-snug text-amber-900 dark:text-amber-100">
                    퀵 등록은 한 번에 한 메뉴만 가능해요. 다시 촬영하거나 직접 입력을
                    이용해 주세요.
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    const raw = priceWonInput.trim();
                    const n =
                      raw === "" ? NaN : Math.round(parseFloat(raw) || 0);
                    const priceWon =
                      Number.isFinite(n) && n > 0 ? n : null;
                    void onConfirm({
                      saveAsFrequent: quickLog
                        ? true
                        : multiItem
                          ? false
                          : saveAsFrequent,
                      portionPct: quickLog ? 100 : portionPct,
                      priceWon,
                      mealSlot,
                      frequentTemplateOnly: quickLog,
                    });
                  }}
                  disabled={
                    isSaving ||
                    (!quickLog && portionPct <= 0) ||
                    scaled.cal <= 0 ||
                    (quickLog && multiItem)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isSaving
                    ? "저장 중..."
                    : quickLog
                      ? "퀵 로그에 등록"
                      : "식단에 추가하기"}
                </button>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
