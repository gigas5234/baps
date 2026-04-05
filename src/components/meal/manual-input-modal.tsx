"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles } from "lucide-react";
import { MEAL_QUICK_PRESETS } from "@/lib/meal-presets";
import { cn } from "@/lib/utils";
import {
  PortionPctSlider,
  type PortionStep,
} from "@/components/meal/portion-pct-slider";

function scaleCal(base: number, pct: PortionStep) {
  return Math.round((base * pct) / 100);
}

function scaleMacro(base: number, pct: PortionStep) {
  return Math.round((base * pct) / 100 * 10) / 10;
}

export interface ManualMealSubmitPayload {
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  saveAsFrequent: boolean;
  /** 이번 기록 끼니 식비(원), 선택 */
  price_won?: number | null;
  /** 자주 먹는 식단 등록 시 항상 1인분(100%) 기준 */
  baseForFrequent: {
    cal: number;
    carbs: number;
    protein: number;
    fat: number;
  };
}

export interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManualMealSubmitPayload) => void;
  isSaving: boolean;
  /** 저장 후 팩폭 토스트 등에 쓰는 맥락 */
  dietContext?: {
    targetCal: number;
    currentCal: number;
    fatGToday: number;
  };
}

export function ManualInputModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  dietContext,
}: ManualInputModalProps) {
  const [foodName, setFoodName] = useState("");
  const [base, setBase] = useState({
    cal: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
  });
  const [portionPct, setPortionPct] = useState<PortionStep>(100);
  const [description, setDescription] = useState("");
  const [clarification, setClarification] = useState<string | null>(null);
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);
  const [priceWonInput, setPriceWonInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFoodName("");
    setBase({ cal: 0, carbs: 0, protein: 0, fat: 0 });
    setPortionPct(100);
    setDescription("");
    setClarification(null);
    setSaveAsFrequent(false);
    setPriceWonInput("");
    setAnalyzeError(null);
    setIsAnalyzing(false);
  }, [isOpen]);

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

  const scaled = useMemo(
    () => ({
      cal: scaleCal(base.cal, portionPct),
      carbs: scaleMacro(base.carbs, portionPct),
      protein: scaleMacro(base.protein, portionPct),
      fat: scaleMacro(base.fat, portionPct),
    }),
    [base, portionPct]
  );

  const fatBudgetG = useMemo(() => {
    const t = dietContext?.targetCal ?? 2000;
    return Math.max((t * 0.35) / 9, 1);
  }, [dietContext?.targetCal]);

  const fatAfter =
    (dietContext?.fatGToday ?? 0) + scaled.fat;
  const fatRatio = fatAfter / fatBudgetG;

  const highCalWarn =
    base.cal >= 2200 ? "strong" : base.cal >= 1500 ? "medium" : null;

  const fatWarn = fatRatio >= 0.8 && scaled.fat > 0;

  const updateBaseFromScaledCal = (scaledCal: number) => {
    const p = portionPct > 0 ? portionPct / 100 : 1;
    setBase((b) => ({ ...b, cal: Math.max(0, Math.round(scaledCal / p)) }));
  };
  const updateBaseFromScaledCarbs = (v: number) => {
    const p = portionPct > 0 ? portionPct / 100 : 1;
    setBase((b) => ({ ...b, carbs: Math.max(0, Math.round((v / p) * 10) / 10) }));
  };
  const updateBaseFromScaledProtein = (v: number) => {
    const p = portionPct > 0 ? portionPct / 100 : 1;
    setBase((b) => ({
      ...b,
      protein: Math.max(0, Math.round((v / p) * 10) / 10),
    }));
  };
  const updateBaseFromScaledFat = (v: number) => {
    const p = portionPct > 0 ? portionPct / 100 : 1;
    setBase((b) => ({ ...b, fat: Math.max(0, Math.round((v / p) * 10) / 10) }));
  };

  const runAnalyze = async () => {
    const q = foodName.trim();
    if (!q || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setClarification(null);
    try {
      const res = await fetch("/api/analyze-food-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error ?? "분석에 실패했어요.");
        return;
      }
      if (data.needs_clarification && data.clarification_message) {
        setClarification(data.clarification_message);
        setBase({ cal: 0, carbs: 0, protein: 0, fat: 0 });
        setDescription("");
        return;
      }
      setFoodName(data.food_name || q);
      setBase({
        cal: Math.max(0, Number(data.cal) || 0),
        carbs: Math.max(0, Number(data.carbs) || 0),
        protein: Math.max(0, Number(data.protein) || 0),
        fat: Math.max(0, Number(data.fat) || 0),
      });
      setDescription(String(data.description ?? ""));
      setPortionPct(100);
      setClarification(null);
    } catch {
      setAnalyzeError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyPreset = (p: (typeof MEAL_QUICK_PRESETS)[number]) => {
    setFoodName(p.food_name);
    setBase({
      cal: p.cal,
      carbs: p.carbs,
      protein: p.protein,
      fat: p.fat,
    });
    setPortionPct(100);
    setDescription("");
    setClarification(null);
    setAnalyzeError(null);
  };

  const handleSubmit = () => {
    const name = foodName.trim();
    if (!name || scaled.cal <= 0) return;
    const pr = priceWonInput.trim();
    const pn = pr === "" ? NaN : Math.round(parseFloat(pr) || 0);
    const price_won = Number.isFinite(pn) && pn > 0 ? pn : null;
    onSubmit({
      food_name: name,
      cal: scaled.cal,
      carbs: scaled.carbs,
      protein: scaled.protein,
      fat: scaled.fat,
      saveAsFrequent,
      price_won,
      baseForFrequent: {
        cal: Math.max(0, Math.round(base.cal)),
        carbs: Math.max(0, Math.round(base.carbs * 10) / 10),
        protein: Math.max(0, Math.round(base.protein * 10) / 10),
        fat: Math.max(0, Math.round(base.fat * 10) / 10),
      },
    });
  };

  const canSubmit =
    foodName.trim().length > 0 &&
    scaled.cal > 0 &&
    portionPct > 0 &&
    !isSaving &&
    !isAnalyzing;

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
            className="max-h-[min(92dvh,100%)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-background p-6 pb-8 touch-pan-y space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">직접 입력</h2>
              <button type="button" onClick={onClose} aria-label="닫기">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {MEAL_QUICK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  onClick={() => applyPreset(p)}
                  className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">음식 이름 *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='예: 제육볶음 1인분, "치킨 한 마리"'
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void runAnalyze();
                  }}
                  className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={!foodName.trim() || isAnalyzing}
                  onClick={() => void runAnalyze()}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl border border-scanner/40 bg-scanner/10 px-3 py-3 text-xs font-semibold text-foreground",
                    "disabled:pointer-events-none disabled:opacity-40",
                    "hover:bg-scanner/18"
                  )}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-scanner" />
                  )}
                  분석
                </button>
              </div>
              {analyzeError ? (
                <p className="text-xs text-destructive">{analyzeError}</p>
              ) : null}
            </div>

            {clarification ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-foreground">
                {clarification}
              </div>
            ) : null}

            {description ? (
              <p className="text-xs leading-relaxed text-muted-foreground dark:text-foreground/70">
                {description}
              </p>
            ) : null}

            {highCalWarn ? (
              <div
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium",
                  highCalWarn === "strong"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-100"
                )}
              >
                {highCalWarn === "strong"
                  ? `⚠️ 약 ${base.cal.toLocaleString()}kcal(1인분 추정) — 한 끼로 매우 높아요.`
                  : `⚠️ 1인분 추정 ${base.cal.toLocaleString()}kcal — 부담 큰 편이에요.`}
                {portionPct < 100 ? (
                  <span className="mt-1 block font-normal opacity-90">
                    이번 기록({portionPct}%):{" "}
                    <strong className="tabular-nums">{scaled.cal}</strong>kcal
                  </span>
                ) : null}
              </div>
            ) : null}

            {fatWarn && dietContext ? (
              <div className="rounded-xl border border-scanner/35 bg-scanner/10 px-3 py-2 text-xs text-foreground">
                오늘 지방 누적·이번 끼로 목표 대비{" "}
                <strong>{Math.round(fatRatio * 100)}%</strong> 구간 — 감시 각이에요.
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">
                  얼마나 먹었나요?
                </label>
                <span className="font-data text-sm font-semibold text-scanner">
                  {portionPct}%
                </span>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground dark:text-foreground/65">
                25% 단위. 남김·일부만 먹었을 때 줄이세요.{" "}
                <strong className="text-foreground">자주 먹는 등록</strong>은
                항상 100%·1인분 기준으로 저장돼요.
              </p>
              <PortionPctSlider
                value={portionPct}
                onChange={setPortionPct}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                칼로리 (kcal) * · 이번에 먹은 양
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="500"
                value={scaled.cal || ""}
                onChange={(e) =>
                  updateBaseFromScaledCal(parseInt(e.target.value, 10) || 0)
                }
                className="font-data w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  탄수화물 (g)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={scaled.carbs || ""}
                  onChange={(e) =>
                    updateBaseFromScaledCarbs(
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="font-data w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  단백질 (g)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={scaled.protein || ""}
                  onChange={(e) =>
                    updateBaseFromScaledProtein(
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="font-data w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  지방 (g)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={scaled.fat || ""}
                  onChange={(e) =>
                    updateBaseFromScaledFat(parseFloat(e.target.value) || 0)
                  }
                  className="font-data w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground dark:text-foreground/65">
              1인분(100%) 기준:{" "}
              <span className="font-data">
                {base.cal}kcal / 탄 {base.carbs}g · 단 {base.protein}g · 지{" "}
                {base.fat}g
              </span>
            </p>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  자주 먹는 식단으로 등록
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Quick Log에는{" "}
                  <strong className="text-foreground">100%·1인분</strong> 영양이
                  저장돼요.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={saveAsFrequent}
                onClick={() => setSaveAsFrequent((v) => !v)}
                className={cn(
                  "relative h-8 w-14 shrink-0 rounded-full transition-colors",
                  saveAsFrequent ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-6 w-6 rounded-full bg-background shadow transition-transform",
                    saveAsFrequent ? "translate-x-6" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">식비(원, 선택)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="이번에 먹은 만큼의 식비"
                value={priceWonInput}
                onChange={(e) => setPriceWonInput(e.target.value)}
                className="font-data w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isSaving ? "저장 중..." : "추가하기"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
