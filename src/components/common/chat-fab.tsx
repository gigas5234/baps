"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

export function ChatFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">AI 상담</h2>
            <button onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-muted-foreground text-center mt-8">
              식단에 대해 무엇이든 물어보세요!
            </p>
          </div>
          <div className="p-4 border-t">
            <input
              type="text"
              placeholder="메시지를 입력하세요..."
              className="w-full rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

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
