"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import Image from "next/image";

interface AnalyzeResult {
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  description: string;
}

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  previewUrl: string | null;
  result: AnalyzeResult | null;
  isAnalyzing: boolean;
  error: string | null;
  onConfirm: (options: { saveAsFrequent: boolean }) => void | Promise<void>;
  isSaving: boolean;
}

export function AnalyzeModal({
  isOpen,
  onClose,
  previewUrl,
  result,
  isAnalyzing,
  error,
  onConfirm,
  isSaving,
}: AnalyzeModalProps) {
  const [saveAsFrequent, setSaveAsFrequent] = useState(false);

  useEffect(() => {
    if (isOpen) setSaveAsFrequent(false);
  }, [isOpen, result?.food_name]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-8 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isAnalyzing ? "분석 중..." : result ? "분석 완료!" : "오류"}
              </h2>
              <button onClick={onClose} disabled={isSaving}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Preview image */}
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted">
                <Image
                  src={previewUrl}
                  alt="촬영한 음식"
                  fill
                  className="object-cover"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                <p>{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xl font-bold">{result.food_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.description}
                  </p>
                </div>

                {/* Nutrition grid */}
                <div className="grid grid-cols-4 gap-2 rounded-2xl border border-grid-line bg-card/50 p-2">
                  {[
                    {
                      label: "칼로리",
                      value: `${result.cal}`,
                      unit: "kcal",
                      color: "text-gauge-caution",
                    },
                    {
                      label: "탄수화물",
                      value: `${result.carbs}`,
                      unit: "g",
                      color: "text-primary",
                    },
                    {
                      label: "단백질",
                      value: `${result.protein}`,
                      unit: "g",
                      color: "text-scanner",
                    },
                    {
                      label: "지방",
                      value: `${result.fat}`,
                      unit: "g",
                      color: "text-amber-600 dark:text-amber-400",
                    },
                  ].map(({ label, value, unit, color }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-grid-line bg-background/60 p-3 text-center"
                    >
                      <p className={`font-data text-lg font-bold ${color}`}>
                        {value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{unit}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                  <input
                    type="checkbox"
                    checked={saveAsFrequent}
                    onChange={(e) => setSaveAsFrequent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm leading-snug">
                    <span className="font-medium text-foreground">
                      자주 먹는 메뉴로 저장
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      이 메뉴를 앞으로도 자주 드실 건가요? 감시 리스트(자주 찾는
                      식단)에 추가해 두겠습니다.
                    </span>
                  </span>
                </label>

                {/* Confirm button */}
                <button
                  onClick={() => void onConfirm({ saveAsFrequent })}
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSaving ? "저장 중..." : "식단에 추가하기"}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
