"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { QuickActionButton } from "@/components/common/quick-action-button";
import { ChatFab } from "@/components/common/chat-fab";
import { ProfileSettingsSheet } from "@/components/common/profile-settings-sheet";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { DailyQuipBanner } from "@/components/dashboard/daily-quip-banner";
import { CalorieGauge } from "@/components/dashboard/calorie-gauge";
import { WeightSparkStrip } from "@/components/dashboard/weight-spark-strip";
import { MealTimeline } from "@/components/dashboard/meal-timeline";
import { HomeDashboardSkeleton } from "@/components/dashboard/home-dashboard-skeleton";
import { WaterCounter } from "@/components/dashboard/water-counter";
import { HomeLanding } from "@/components/home/home-landing";
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
import { compressImageForAnalysis } from "@/lib/image-compress";
import { uploadMealImage } from "@/lib/storage";
import { getCalorieZone } from "@/lib/calorie-zone";
import { sumMealMacros } from "@/lib/meal-macros";
import { syncSelectedDateToLocalTodayOnce } from "@/lib/local-date";
import {
  getRecommendedWaterMl,
  getWaterTargetCups,
} from "@/lib/water-goal";
import { normalizeWaterCupMl } from "@/lib/water-cup";
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
  const { selectedDate, setSelectedDate } = useMealStore();
  const { userName, targetCal, waterCupMl } = useProfileStore();
  const setProfileStore = useProfileStore((s) => s.setProfile);
  const { userId, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    refetch: refetchProfile,
    isLoading: profileLoading,
    isError: profileQueryError,
  } = useProfile(userId);

  const { data: meals = [], isPending: mealsPending } = useMeals(
    userId,
    selectedDate
  );
  const { data: waterLog } = useWaterLog(userId, selectedDate);
  const adjustWater = useAdjustWater(userId, selectedDate);
  const displayName = profile?.user_name?.trim() || userName;
  const target = profile?.target_cal ?? targetCal ?? 2000;
  const totalCalories = useDailyCalories(meals);
  const macroTotals = sumMealMacros(meals);
  const calorieZone = getCalorieZone(totalCalories, target);

  const [settingsOpen, setSettingsOpen] = useState(false);

  /** 첫 로드 시 로컬 오늘로 맞춤(UTC 초기값·날짜 밀림 방지). 같은 탭에서 재방문 시 선택 유지 */
  useLayoutEffect(() => {
    syncSelectedDateToLocalTodayOnce(setSelectedDate);
  }, [setSelectedDate]);

  useEffect(() => {
    if (!profile) return;
    setProfileStore({
      userName: profile.user_name ?? "",
      bmr: profile.bmr ?? 0,
      targetCal: profile.target_cal ?? 0,
      ...(profile.water_cup_ml != null
        ? { waterCupMl: normalizeWaterCupMl(profile.water_cup_ml) }
        : {}),
    });
  }, [
    profile?.updated_at,
    profile?.user_name,
    profile?.bmr,
    profile?.target_cal,
    profile?.water_cup_ml,
    setProfileStore,
  ]);

  const cupMl = normalizeWaterCupMl(
    profile?.water_cup_ml ?? waterCupMl
  );

  const waterRecommendedMl = useMemo(
    () =>
      getRecommendedWaterMl({
        weightKg: profile?.weight ?? null,
        gender: profile?.gender ?? null,
        age: profile?.age ?? null,
        bmr: profile?.bmr ?? null,
        targetCal: target,
      }),
    [profile?.weight, profile?.gender, profile?.age, profile?.bmr, target]
  );

  const waterTargetCups = useMemo(
    () => getWaterTargetCups(waterRecommendedMl, cupMl),
    [waterRecommendedMl, cupMl]
  );

  const showDashboardSkeleton =
    authLoading ||
    (!!userId &&
      profileLoading &&
      !profile &&
      !profileQueryError) ||
    (!!userId && mealsPending);

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
      // 1. 리사이즈·JPEG 압축 후 Base64 전송 (Vercel 413 본문 제한 대응)
      const prepared = await compressImageForAnalysis(file);

      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: prepared.base64,
          mimeType: prepared.mimeType,
        }),
      });

      const data =
        res.status === 413
          ? { error: "전송 용량이 한도를 넘었어요. 다른 사진으로 시도해 주세요." }
          : await res.json();

      if (!res.ok) {
        setAnalyzeError(data.error || "분석 실패");
        return;
      }

      setAnalyzeResult(data);

      // 2. 스토리지에는 압축본 업로드(용량·일관성)
      if (userId) {
        const url = await uploadMealImage(userId, prepared.file);
        setImageUrl(url);
      }
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : "분석 중 오류가 발생했어요. 다시 시도해주세요."
      );
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

  if (authLoading) {
    return <HomeLanding phase="loading" />;
  }

  if (!userId) {
    return <HomeLanding phase="guest" />;
  }

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
        {authLoading ? (
          <div className="flex w-full items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-20 rounded-md bg-muted animate-pulse" />
              <div className="h-4 w-48 max-w-[70%] rounded bg-muted/80 animate-pulse" />
            </div>
            <div className="h-11 w-11 shrink-0 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="text-xl font-bold tracking-tight">
                  <Link
                    href="/"
                    className="rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    BAPS
                  </Link>
                </h1>
                <Link
                  href="/intro"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  소개
                </Link>
              </div>
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
          </>
        )}
      </header>

      {/* Weekly Calendar */}
      <section className="px-4 py-2">
        <WeeklyCalendar />
      </section>

      {!authLoading && !showDashboardSkeleton && userId ? (
        <div className="pb-1 pt-1">
          <DailyQuipBanner
            displayName={displayName}
            totalCal={totalCalories}
            target={target}
            mealCount={meals.length}
            macros={macroTotals}
            waterCups={waterLog?.cups ?? 0}
            cupMl={cupMl}
            waterRecommendedMl={waterRecommendedMl}
            zone={calorieZone}
          />
        </div>
      ) : null}

      {showDashboardSkeleton ? (
        <HomeDashboardSkeleton />
      ) : (
        <>
          <section className="px-4 py-3">
            <CalorieGauge
              current={totalCalories}
              target={target}
              macros={macroTotals}
            />
          </section>

          <section className="px-4 py-2">
            <WaterCounter
              cups={waterLog?.cups ?? 0}
              cupMl={cupMl}
              targetCups={waterTargetCups}
              recommendedMl={waterRecommendedMl}
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

          {userId ? (
            <div className="pb-3">
              <WeightSparkStrip
                userId={userId}
                selectedDate={selectedDate}
                profileKg={profile?.weight ?? null}
                targetWeightKg={profile?.target_weight ?? null}
                onSavedProfile={() =>
                  void queryClient.invalidateQueries({
                    queryKey: ["profile", userId],
                  })
                }
              />
            </div>
          ) : null}

          <section className="px-4 py-3">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              오늘 먹은 것
            </h2>
            <MealTimeline meals={meals} />
          </section>
        </>
      )}

      {!authLoading && userId && !showDashboardSkeleton ? (
        <>
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
            waterCupMl={cupMl}
            waterTargetCups={waterTargetCups}
            waterRecommendedMl={waterRecommendedMl}
          />
        </>
      ) : null}

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
