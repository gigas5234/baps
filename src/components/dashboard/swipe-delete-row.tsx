"use client";

import { useCallback } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwipeDeleteRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
}

/** 왼쪽으로 밀어 삭제 레이어를 드러낸 뒤, 임계값 이상이면 onDelete */
export function SwipeDeleteRow({
  children,
  onDelete,
  disabled,
  className,
}: SwipeDeleteRowProps) {
  const x = useMotionValue(0);
  const overlayOpacity = useTransform(x, [-72, -24, 0], [1, 0.45, 0]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (disabled) return;
      const threshold = -56;
      if (info.offset.x < threshold || info.velocity.x < -380) {
        onDelete();
      }
      x.set(0);
    },
    [disabled, onDelete, x]
  );

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <motion.div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-[4.5rem] items-center justify-center bg-destructive/92 text-[11px] font-semibold text-destructive-foreground"
        style={{ opacity: overlayOpacity }}
        aria-hidden
      >
        삭제
      </motion.div>
      <motion.div
        drag={disabled ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -88, right: 0 }}
        dragElastic={{ left: 0.06, right: 0.02 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative w-full rounded-2xl bg-card",
          !disabled && "cursor-grab active:cursor-grabbing"
        )}
      >
        {children}
      </motion.div>
    </div>
  );
}
