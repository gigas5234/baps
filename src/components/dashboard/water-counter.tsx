"use client";

import { motion } from "framer-motion";
import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterCounterProps {
  cups: number;
  onAdd: () => void;
  isAdding?: boolean;
}

const TARGET_CUPS = 8; // 하루 목표: 8잔 (2L)

export function WaterCounter({ cups, onAdd, isAdding }: WaterCounterProps) {
  const percentage = Math.min((cups / TARGET_CUPS) * 100, 100);

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">물 섭취</p>
            <p className="text-xs text-muted-foreground">
              {cups}잔 / {TARGET_CUPS}잔 ({cups * 250}ml)
            </p>
          </div>
        </div>

        <button
          onClick={onAdd}
          disabled={isAdding}
          className="bg-cyan-500 text-white text-xs font-medium rounded-full px-3 py-1.5 active:scale-95 transition-transform disabled:opacity-50"
        >
          + 1잔
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
