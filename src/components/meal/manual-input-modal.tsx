"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { MEAL_QUICK_PRESETS } from "@/lib/meal-presets";

interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    food_name: string;
    cal: number;
    carbs: number;
    protein: number;
    fat: number;
  }) => void;
  isSaving: boolean;
}

export function ManualInputModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving,
}: ManualInputModalProps) {
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");

  const handleSubmit = () => {
    if (!foodName || !cal) return;
    onSubmit({
      food_name: foodName,
      cal: parseInt(cal),
      carbs: parseFloat(carbs) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
    });
    // Reset
    setFoodName("");
    setCal("");
    setCarbs("");
    setProtein("");
    setFat("");
  };

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
            className="w-full max-w-md bg-background rounded-t-3xl p-6 pb-8 space-y-4"
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
                  onClick={() => {
                    setFoodName(p.food_name);
                    setCal(String(p.cal));
                    setCarbs(String(p.carbs));
                    setProtein(String(p.protein));
                    setFat(String(p.fat));
                  }}
                  className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Food name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">음식 이름 *</label>
              <input
                type="text"
                placeholder="예: 김치찌개"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Calories */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">칼로리 (kcal) *</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="500"
                value={cal}
                onChange={(e) => setCal(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Macros row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">탄수화물 (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">단백질 (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">지방 (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!foodName || !cal || isSaving}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isSaving ? "저장 중..." : "추가하기"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
