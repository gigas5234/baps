"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QuickActionButton } from "@/components/common/quick-action-button";
import { ChatFab } from "@/components/common/chat-fab";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { CalorieGauge } from "@/components/dashboard/calorie-gauge";
import { MealTimeline } from "@/components/dashboard/meal-timeline";
import { WaterCounter } from "@/components/dashboard/water-counter";
import { AnalyzeModal } from "@/components/meal/analyze-modal";
import { ManualInputModal } from "@/components/meal/manual-input-modal";
import { useMealStore } from "@/store/use-meal-store";
import { useProfileStore } from "@/store/use-profile-store";
import { useAuth } from "@/lib/use-auth";
import { useMeals, useWaterLog, useAddWater, useDailyCalories } from "@/lib/queries";
import { uploadMealImage, fileToBase64 } from "@/lib/storage";
import { createClient } from "@/lib/supabase-browser";

interface AnalyzeResult {
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  description: string;
}

export default function HomePage() {
  const { selectedDate } = useMealStore();
  const { userName, targetCal } = useProfileStore();
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: meals = [] } = useMeals(userId, selectedDate);
  const { data: waterLog } = useWaterLog(userId, selectedDate);
  const addWater = useAddWater(userId, selectedDate);
  const totalCalories = useDailyCalories(meals);

  const target = targetCal || 2000;

  // Camera / Analyze state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Manual input state
  const [manualOpen, setManualOpen] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);

  const handleCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzeResult(null);
    setAnalyzeError(null);
    setImageUrl(null);
    setAnalyzeOpen(true);
    setIsAnalyzing(true);

    try {
      // 1. Base64로 변환해서 Gemini에 전송
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAnalyzeError(data.error || "분석 실패");
        return;
      }

      setAnalyzeResult(data);

      // 2. Supabase Storage에 이미지 업로드 (분석과 병렬로 해도 되지만 순차로)
      if (userId) {
        const url = await uploadMealImage(userId, file);
        setImageUrl(url);
      }
    } catch {
      setAnalyzeError("분석 중 오류가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
      // input 초기화 (같은 파일 다시 선택 가능)
      e.target.value = "";
    }
  };

  const handleConfirmAnalysis = async () => {
    if (!analyzeResult || !userId) return;
    setIsSaving(true);

    try {
      const supabase = createClient();
      await supabase.from("meals").insert({
        user_id: userId,
        food_name: analyzeResult.food_name,
        cal: analyzeResult.cal,
        carbs: analyzeResult.carbs,
        protein: analyzeResult.protein,
        fat: analyzeResult.fat,
        image_url: imageUrl,
      });

      // 메인 화면 데이터 갱신
      queryClient.invalidateQueries({ queryKey: ["meals", userId, selectedDate] });
      setAnalyzeOpen(false);
    } catch {
      setAnalyzeError("저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSubmit = async (data: {
    food_name: string;
    cal: number;
    carbs: number;
    protein: number;
    fat: number;
  }) => {
    if (!userId) return;
    setIsManualSaving(true);

    try {
      const supabase = createClient();
      await supabase.from("meals").insert({
        user_id: userId,
        food_name: data.food_name,
        cal: data.cal,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
        image_url: null,
      });

      queryClient.invalidateQueries({ queryKey: ["meals", userId, selectedDate] });
      setManualOpen(false);
    } finally {
      setIsManualSaving(false);
    }
  };

  return (
    <main className="flex-1 pb-28 max-w-md mx-auto w-full">
      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">BAPS</h1>
          <p className="text-sm text-muted-foreground">
            {userName ? `${userName}님, 오늘도 건강하게!` : "오늘도 건강하게!"}
          </p>
        </div>
      </header>

      {/* Weekly Calendar */}
      <section className="px-4 py-2">
        <WeeklyCalendar />
      </section>

      {/* Calorie Gauge */}
      <section className="px-4 py-3">
        <CalorieGauge current={totalCalories} target={target} />
      </section>

      {/* Water Counter */}
      <section className="px-4 py-2">
        <WaterCounter
          cups={waterLog?.cups ?? 0}
          onAdd={() => addWater.mutate(waterLog?.cups ?? 0)}
          isAdding={addWater.isPending}
        />
      </section>

      {/* Meal Timeline */}
      <section className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          오늘 먹은 것
        </h2>
        <MealTimeline meals={meals} />
      </section>

      {/* Floating Actions */}
      <QuickActionButton
        onCamera={handleCamera}
        onManualInput={() => setManualOpen(true)}
        onWater={() => addWater.mutate(waterLog?.cups ?? 0)}
      />
      <ChatFab
        meals={meals}
        totalCal={totalCalories}
        targetCal={target}
        waterCups={waterLog?.cups ?? 0}
      />

      {/* Analyze Modal */}
      <AnalyzeModal
        isOpen={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        imageUrl={imageUrl}
        previewUrl={previewUrl}
        result={analyzeResult}
        isAnalyzing={isAnalyzing}
        error={analyzeError}
        onConfirm={handleConfirmAnalysis}
        isSaving={isSaving}
      />

      {/* Manual Input Modal */}
      <ManualInputModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        onSubmit={handleManualSubmit}
        isSaving={isManualSaving}
      />
    </main>
  );
}
