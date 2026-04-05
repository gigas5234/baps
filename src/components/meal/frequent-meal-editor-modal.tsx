"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FrequentMeal } from "@/types/database";

export interface FrequentMealEditorPayload {
  id?: string;
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  price_won: number | null;
}

interface FrequentMealEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FrequentMealEditorPayload) => Promise<void>;
  /** null이면 새로 등록 */
  initial: FrequentMeal | null;
  isSaving: boolean;
}

export function FrequentMealEditorModal({
  isOpen,
  onClose,
  onSave,
  initial,
  isSaving,
}: FrequentMealEditorModalProps) {
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [priceWonInput, setPriceWonInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSaveError(null);
    setAnalyzeError(null);
    setClarification(null);
    setDescription("");
    setIsAnalyzing(false);
    if (initial) {
      setFoodName(initial.food_name);
      setCal(Math.max(0, Number(initial.cal) || 0));
      setCarbs(Number(initial.carbs) || 0);
      setProtein(Number(initial.protein) || 0);
      setFat(Number(initial.fat) || 0);
      const pw = initial.price_won;
      setPriceWonInput(
        pw != null && Number(pw) > 0 ? String(Math.round(Number(pw))) : ""
      );
    } else {
      setFoodName("");
      setCal(0);
      setCarbs(0);
      setProtein(0);
      setFat(0);
      setPriceWonInput("");
    }
  }, [isOpen, initial]);

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
        setCal(0);
        setCarbs(0);
        setProtein(0);
        setFat(0);
        setDescription("");
        return;
      }
      setFoodName(data.food_name || q);
      setCal(Math.max(0, Number(data.cal) || 0));
      setCarbs(Math.max(0, Number(data.carbs) || 0));
      setProtein(Math.max(0, Number(data.protein) || 0));
      setFat(Math.max(0, Number(data.fat) || 0));
      setDescription(String(data.description ?? ""));
      setClarification(null);
    } catch {
      setAnalyzeError("네트워크 오류예요. 다시 시도해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    const name = foodName.trim();
    if (!name || cal <= 0 || isSaving) return;
    const pr = priceWonInput.trim();
    const pn = pr === "" ? NaN : Math.round(parseFloat(pr) || 0);
    const price_won = Number.isFinite(pn) && pn > 0 ? pn : null;
    setSaveError(null);
    try {
      await onSave({
        id: initial?.id,
        food_name: name,
        cal: Math.round(cal),
        carbs: Math.round(carbs * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        price_won,
      });
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "저장에 실패했어요. 이름이 중복일 수 있어요."
      );
    }
  };

  const canSave =
    foodName.trim().length > 0 && cal > 0 && !isSaving && !isAnalyzing;

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
            className="max-h-[min(92dvh,100%)] w-full max-w-md touch-pan-y space-y-4 overflow-y-auto overscroll-contain rounded-t-3xl bg-background p-6 pb-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {initial ? "자주 먹는 식단 수정" : "자주 먹는 식단 등록"}
              </h2>
              <button type="button" onClick={onClose} aria-label="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground">
              1인분·100% 기준 영양과 대표 식비만 저장합니다. 퀵 로그 탭 시 오늘
              식단에 같은 값으로 추가됩니다.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">음식 이름 *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='예: 제육볶음 1인분'
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

            <div className="space-y-1.5">
              <label className="text-sm font-medium">칼로리 (kcal) * · 1인분</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="500"
                value={cal || ""}
                onChange={(e) =>
                  setCal(Math.max(0, parseInt(e.target.value, 10) || 0))
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
                  value={carbs || ""}
                  onChange={(e) =>
                    setCarbs(parseFloat(e.target.value) || 0)
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
                  value={protein || ""}
                  onChange={(e) =>
                    setProtein(parseFloat(e.target.value) || 0)
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
                  value={fat || ""}
                  onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
                  className="font-data w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">식비(원, 선택)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="예: 8000 (비우면 미적용)"
                value={priceWonInput}
                onChange={(e) => setPriceWonInput(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {saveError ? (
              <p className="text-xs text-destructive">{saveError}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {isSaving ? "저장 중..." : initial ? "저장" : "등록하기"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
