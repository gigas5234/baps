"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Images, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  onCamera?: () => void;
  onGallery?: () => void;
  onManualInput?: () => void;
}

const actions = [
  {
    id: "camera",
    icon: Camera,
    label: "사진 찍기",
    color: "bg-blue-500 shadow-blue-500/30",
  },
  {
    id: "gallery",
    icon: Images,
    label: "사진첩",
    color: "bg-violet-500 shadow-violet-500/30",
  },
  {
    id: "manual",
    icon: Pencil,
    label: "직접 입력",
    color: "bg-green-500 shadow-green-500/30",
  },
] as const;

export function QuickActionButton({
  onCamera,
  onGallery,
  onManualInput,
}: QuickActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlers: Record<string, (() => void) | undefined> = {
    camera: onCamera,
    gallery: onGallery,
    manual: onManualInput,
  };

  const handleAction = (id: string) => {
    handlers[id]?.();
    setIsOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
        {/* Action items */}
        <AnimatePresence>
          {isOpen && (
            <div className="flex gap-5">
              {actions.map(({ id, icon: Icon, label, color }, i) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 30, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.5 }}
                  transition={{
                    duration: 0.25,
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleAction(id)}
                    className={cn(
                      "text-white rounded-full p-3.5 shadow-lg active:scale-90 transition-transform",
                      color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                  <span className="text-[10px] font-medium text-foreground/80">
                    {label}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary text-primary-foreground rounded-full p-4 shadow-xl active:scale-90 transition-colors"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </>
  );
}
