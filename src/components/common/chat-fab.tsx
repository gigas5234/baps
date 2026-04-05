"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types/database";

interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
}

interface ChatFabProps {
  meals: Meal[];
  totalCal: number;
  targetCal: number;
  waterCups: number;
}

export function ChatFab({ meals, totalCal, targetCal, waterCups }: ChatFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      message: input.trim(),
      is_ai: false,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.message,
          context: {
            todayMeals: meals.map((m) => ({
              food_name: m.food_name,
              cal: m.cal,
            })),
            totalCal,
            targetCal,
            waterCups,
          },
          history: messages.slice(-10), // 최근 10개 컨텍스트
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          message: data.reply || data.error || "응답을 받지 못했어요.",
          is_ai: true,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          message: "네트워크 오류가 발생했어요. 다시 시도해주세요.",
          is_ai: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h2 className="text-base font-bold">AI 식단 상담</h2>
                <p className="text-[10px] text-muted-foreground">
                  오늘 {totalCal}kcal 섭취 · 목표 {targetCal}kcal
                </p>
              </div>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center mt-12 space-y-2">
                  <p className="text-2xl">🤖</p>
                  <p className="text-sm text-muted-foreground">
                    식단에 대해 무엇이든 물어보세요!
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {[
                      "오늘 저녁 뭐 먹을까?",
                      "지금 치킨 먹어도 돼?",
                      "오늘 식단 평가해줘",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q);
                        }}
                        className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.is_ai
                      ? "bg-muted self-start mr-auto"
                      : "bg-primary text-primary-foreground self-end ml-auto"
                  )}
                >
                  {msg.message}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>생각 중...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 rounded-full border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-violet-600 text-white rounded-full p-2.5 disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 z-40 bg-violet-600 text-white rounded-full p-3.5 shadow-xl active:scale-95 transition-transform"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
