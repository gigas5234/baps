"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { QuickActionButton } from "@/components/common/quick-action-button";
import { ChatFab } from "@/components/common/chat-fab";
import { ProfileSettingsSheet } from "@/components/common/profile-settings-sheet";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { CalorieGauge } from "@/components/dashboard/calorie-gauge";
import { MealTimeline } from "@/components/dashboard/meal-timeline";
import { WaterCounter } from "@/components/dashboard/water-counter";
import { AnalyzeModal } from "@/components/meal/analyze-modal";
import { ManualInputModal } from "@/components/meal/manual-input-modal";
import { useMealStore } from "@/store/use-meal-store";
import { useProfileStore } from "@/store/use-profile-store";
import { useAuth } from "@/lib/use-auth";
import {
  useMeals,
  useWaterLog,
  useAdjustWater,
  useDailyCalories,
  useProfile,
} from "@/lib/queries";
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
  const setProfileStore = useProfileStore((s) => s.setProfile);
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    refetch: refetchProfile,
    isLoading: profileLoading,
    isError: profileQueryError,
  } = useProfile(userId);

  const { data: meals = [] } = useMeals(userId, selectedDate);
  const { data: waterLog } = useWaterLog(userId, selectedDate);
  const adjustWater = useAdjustWater(userId, selectedDate);
  const totalCalories = useDailyCalories(meals);

  const displayName = profile?.user_name?.trim() || userName;
  const target = profile?.target_cal ?? targetCal ?? 2000;

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setProfileStore({
      userName: profile.user_name ?? "",
      bmr: profile.bmr ?? 0,
      targetCal: profile.target_cal ?? 0,
    });
  }, [
    profile?.updated_at,
    profile?.user_name,
    profile?.bmr,
    profile?.target_cal,
    setProfileStore,
  ]);

  useEffect(() => {
    if (settingsOpen && userId) void refetchProfile();
  }, [settingsOpen, userId, refetchProfile]);

  // Camera / gallery → same analyze + storage flow (handleFileChange)
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

  const openCameraPicker = () => {
    cameraInputRef.current?.click();
  };

  const openGalleryPicker = () => {
    galleryInputRef.current?.click();
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
      {/* 카메라: 촬영 우선 (모바일에서 후면 카메라) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* 사진첩: 갤러리/라이브러리에서 선택 (capture 없음) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">BAPS</h1>
          <p className="text-sm text-muted-foreground truncate">
            {displayName
              ? `${displayName}님, 오늘도 건강하게!`
              : "오늘도 건강하게!"}
          </p>
        </div>
        {userId ? (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0 rounded-xl border p-2.5 hover:bg-muted transition-colors"
            aria-label="개인 설정"
          >
            <Menu className="w-5 h-5" />
          </button>
        ) : null}
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
          onIncrement={() =>
            adjustWater.mutate({
              currentCups: waterLog?.cups ?? 0,
              delta: 1,
            })
          }
          onDecrement={() =>
            adjustWater.mutate({
              currentCups: waterLog?.cups ?? 0,
              delta: -1,
            })
          }
          isUpdating={adjustWater.isPending}
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
        onCamera={openCameraPicker}
        onGallery={openGalleryPicker}
        onManualInput={() => setManualOpen(true)}
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

      <ProfileSettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userId={userId}
        profile={profile ?? null}
        isLoadingProfile={profileLoading}
        profileQueryError={profileQueryError}
        onRetryProfile={() => void refetchProfile()}
      />
    </main>
  );
}
