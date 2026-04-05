"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Menu, UtensilsCrossed } from "lucide-react";
import { GoogleSignInButtonBlock } from "@/components/common/google-sign-in-button-block";
import { QuickActionButton } from "@/components/common/quick-action-button";
import { ChatFab } from "@/components/common/chat-fab";
import { ProfileSettingsSheet } from "@/components/common/profile-settings-sheet";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { DailyQuipBanner } from "@/components/dashboard/daily-quip-banner";
import { CalorieGauge } from "@/components/dashboard/calorie-gauge";
import { WeightSparkStrip } from "@/components/dashboard/weight-spark-strip";
import { MealTimeline } from "@/components/dashboard/meal-timeline";
import { QuickLogSlider } from "@/components/dashboard/quick-log-slider";
import { HomeDashboardSkeleton } from "@/components/dashboard/home-dashboard-skeleton";
import { WaterCounter } from "@/components/dashboard/water-counter";
import { HomeLanding } from "@/components/home/home-landing";
import { AnalyzeModal } from "@/components/meal/analyze-modal";
import {
  ManualInputModal,
  type ManualMealSubmitPayload,
} from "@/components/meal/manual-input-modal";
import {
  FrequentMealEditorModal,
  type FrequentMealEditorPayload,
} from "@/components/meal/frequent-meal-editor-modal";
import { useMealStore } from "@/store/use-meal-store";
import { useProfileStore } from "@/store/use-profile-store";
import { useAuth } from "@/lib/use-auth";
import {
  useMeals,
  useFrequentMeals,
  useWaterLog,
  useAdjustWater,
  useDailyCalories,
  useProfile,
  useDeleteMeal,
} from "@/lib/queries";
import { rankFrequentMealsForNow } from "@/lib/frequent-meals-rank";
import { bumpFrequentMealLog } from "@/lib/frequent-meals";
import { trackBapsEvent } from "@/lib/analytics";
import type { FrequentMeal, Meal } from "@/types/database";
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
import { ThemeToggleIcons } from "@/components/theme-toggle-icons";
import { cn } from "@/lib/utils";

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
  const {
    data: frequentMealsRaw = [],
    isPending: frequentMealsPending,
  } = useFrequentMeals(userId);

  const quickLogItems = useMemo(
    () => rankFrequentMealsForNow(frequentMealsRaw, new Date(), 5),
    [frequentMealsRaw]
  );
  const { data: waterLog } = useWaterLog(userId, selectedDate);
  const adjustWater = useAdjustWater(userId, selectedDate);
  const deleteMealMutation = useDeleteMeal(userId, selectedDate);
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

  const [frequentEditorOpen, setFrequentEditorOpen] = useState(false);
  const [frequentEditorInitial, setFrequentEditorInitial] =
    useState<FrequentMeal | null>(null);
  const [frequentEditorSaving, setFrequentEditorSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [quickLogBusyId, setQuickLogBusyId] = useState<string | null>(null);
  const [mealDeletingId, setMealDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** 탑바: 스크롤 시 글래스 + 잔여 칼로리 중앙 */
  const [topBarCompact, setTopBarCompact] = useState(false);
  useEffect(() => {
    const THRESHOLD = 32;
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setTopBarCompact(y > THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const remainingKcal = Math.round(target - totalCalories);

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

  const handleConfirmAnalysis = async ({
    saveAsFrequent,
    portionPct,
    priceWon,
  }: {
    saveAsFrequent: boolean;
    portionPct: number;
    priceWon: number | null;
  }) => {
    if (!analyzeResult || !userId) return;
    const p = Math.min(100, Math.max(0, portionPct)) / 100;
    if (p <= 0) return;

    setIsSaving(true);

    const cal = Math.round(analyzeResult.cal * p);
    const carbs = Math.round(analyzeResult.carbs * p * 10) / 10;
    const protein = Math.round(analyzeResult.protein * p * 10) / 10;
    const fat = Math.round(analyzeResult.fat * p * 10) / 10;

    try {
      const supabase = createClient();
      const { error: mealErr } = await supabase.rpc(
        "confirm_meal_and_optional_frequent",
        {
          p_food_name: analyzeResult.food_name,
          p_cal: cal,
          p_carbs: carbs,
          p_protein: protein,
          p_fat: fat,
          p_image_url: imageUrl,
          p_price_won: priceWon,
          p_save_frequent: saveAsFrequent,
          p_frequent_cal: analyzeResult.cal,
          p_frequent_carbs: analyzeResult.carbs,
          p_frequent_protein: analyzeResult.protein,
          p_frequent_fat: analyzeResult.fat,
          p_frequent_image_url: imageUrl,
        }
      );
      if (mealErr) throw mealErr;

      queryClient.invalidateQueries({ queryKey: ["meals", userId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["frequentMeals", userId] });
      setAnalyzeOpen(false);
      trackBapsEvent("meal_saved", {
        source: "analyze_image",
        save_as_frequent: saveAsFrequent,
        has_price: priceWon != null,
      });
      if (saveAsFrequent) setToast("자주 먹는 메뉴에도 저장했어요");
      else setToast("식단에 추가되었습니다");
    } catch {
      setAnalyzeError("저장에 실패했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualSubmit = async (data: ManualMealSubmitPayload) => {
    if (!userId) return;
    setIsManualSaving(true);

    const fatBudgetG = Math.max((target * 0.35) / 9, 1);
    const fatAfterLog = macroTotals.fatG + data.fat;
    const fatBomb =
      fatAfterLog >= fatBudgetG * 0.85 &&
      data.fat > 0;

    try {
      const supabase = createClient();
      const b = data.baseForFrequent;
      const { error: mealErr } = await supabase.rpc(
        "confirm_meal_and_optional_frequent",
        {
          p_food_name: data.food_name,
          p_cal: data.cal,
          p_carbs: data.carbs,
          p_protein: data.protein,
          p_fat: data.fat,
          p_image_url: null,
          p_price_won: data.price_won ?? null,
          p_save_frequent: data.saveAsFrequent,
          p_frequent_cal: b.cal,
          p_frequent_carbs: b.carbs,
          p_frequent_protein: b.protein,
          p_frequent_fat: b.fat,
          p_frequent_image_url: null,
        }
      );
      if (mealErr) throw mealErr;

      queryClient.invalidateQueries({ queryKey: ["meals", userId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["frequentMeals", userId] });
      setManualOpen(false);
      trackBapsEvent("meal_saved", {
        source: "manual",
        save_as_frequent: data.saveAsFrequent,
        has_price: data.price_won != null,
      });
      if (fatBomb) {
        setToast(
          `${data.food_name}까지 더하니… 오늘 지방이 이미 빠듯해. 데이터가 널 보고 있어.`
        );
      } else if (data.saveAsFrequent) {
        setToast("자주 먹는 메뉴에도 저장했어요");
      } else {
        setToast("식단에 추가되었습니다");
      }
    } finally {
      setIsManualSaving(false);
    }
  };

  const saveFrequentMealFromEditor = async (data: FrequentMealEditorPayload) => {
    if (!userId) throw new Error("로그인이 필요해요");
    setFrequentEditorSaving(true);
    try {
      const supabase = createClient();
      const price =
        data.price_won != null && data.price_won > 0 ? data.price_won : null;
      if (data.id) {
        const { error } = await supabase
          .from("frequent_meals")
          .update({
            food_name: data.food_name,
            cal: data.cal,
            carbs: data.carbs,
            protein: data.protein,
            fat: data.fat,
            price_won: price,
          })
          .eq("id", data.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("frequent_meals").insert({
          user_id: userId,
          food_name: data.food_name,
          cal: data.cal,
          carbs: data.carbs,
          protein: data.protein,
          fat: data.fat,
          image_url: null,
          count: 1,
          last_eaten_at: new Date().toISOString(),
          price_won: price,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["frequentMeals", userId] });
      setFrequentEditorOpen(false);
      setToast(
        data.id ? "자주 먹는 식단을 수정했어요" : "자주 먹는 식단에 등록했어요"
      );
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "";
      const dup =
        raw.toLowerCase().includes("duplicate") ||
        (e &&
          typeof e === "object" &&
          "code" in e &&
          String((e as { code: string }).code) === "23505");
      throw new Error(
        dup
          ? "같은 이름의 자주 먹는 식단이 이미 있어요"
          : raw || "저장에 실패했어요"
      );
    } finally {
      setFrequentEditorSaving(false);
    }
  };

  const handleQuickLogPick = async (item: FrequentMeal) => {
    if (!userId || quickLogBusyId) return;
    setQuickLogBusyId(item.id);
    try {
      const supabase = createClient();
      const mealPrice =
        item.price_won != null && Number(item.price_won) > 0
          ? Math.round(Number(item.price_won))
          : null;
      const { error: mealErr } = await supabase.from("meals").insert({
        user_id: userId,
        food_name: item.food_name,
        cal: item.cal,
        carbs: Number(item.carbs),
        protein: Number(item.protein),
        fat: Number(item.fat),
        image_url: item.image_url,
        price_won: mealPrice,
      });
      if (mealErr) throw mealErr;
      await bumpFrequentMealLog(supabase, item.id);
      queryClient.invalidateQueries({ queryKey: ["meals", userId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["frequentMeals", userId] });
      setToast("식단에 추가되었습니다");
    } catch {
      setToast("추가에 실패했어요");
    } finally {
      setQuickLogBusyId(null);
    }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    if (!userId || mealDeletingId) return;
    setMealDeletingId(meal.id);
    try {
      await deleteMealMutation.mutateAsync(meal.id);
      setToast("기록을 삭제했어요");
    } catch {
      setToast("삭제에 실패했어요");
    } finally {
      setMealDeletingId(null);
    }
  };

  if (authLoading) {
    return <HomeLanding phase="loading" />;
  }

  return (
    <main
      className={cn(
        "flex-1 max-w-md mx-auto w-full",
        userId ? "pb-28" : "pb-36"
      )}
    >
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

      {/* Fixed glass top bar — 스크롤 시 블러·슬림·중앙 잔여 kcal */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[box-shadow,border-color,background-color] duration-300 ease-out",
          topBarCompact
            ? "border-b border-border/35 bg-background/72 shadow-[0_1px_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-background/58 dark:shadow-[0_1px_16px_-4px_rgba(0,0,0,0.45)]"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-md items-center px-4 transition-[padding] duration-300 ease-out",
            topBarCompact
              ? "min-h-11 justify-between gap-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]"
              : "justify-between gap-3 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))]"
          )}
        >
          {!topBarCompact ? (
            <>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight">
                  <Link
                    href="/intro"
                    className="rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    BAPS
                  </Link>
                </h1>
                <p className="truncate text-sm text-muted-foreground dark:text-foreground/75">
                  {userId
                    ? displayName
                      ? `${displayName}님, 오늘도 건강하게!`
                      : "오늘도 건강하게!"
                    : "로그인하면 기록이 저장돼요"}
                </p>
              </div>
              {userId ? (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="shrink-0 rounded-xl border p-2.5 transition-colors hover:bg-muted"
                  aria-label="개인 설정"
                >
                  <Menu className="h-5 w-5" />
                </button>
              ) : (
                <ThemeToggleIcons className="shrink-0" />
              )}
            </>
          ) : userId ? (
            <>
              <div className="w-11 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1 text-center font-data text-xs font-semibold tabular-nums leading-tight text-foreground">
                {remainingKcal >= 0 ? (
                  <>
                    남은{" "}
                    <span className="text-sm text-teal-700 dark:text-teal-400">
                      {remainingKcal.toLocaleString()}
                    </span>{" "}
                    kcal
                  </>
                ) : (
                  <>
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      {Math.abs(remainingKcal).toLocaleString()}
                    </span>{" "}
                    kcal 초과
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-muted/80"
                aria-label="개인 설정"
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/intro"
                className="min-w-0 text-sm font-bold tracking-tight text-foreground outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                BAPS
              </Link>
              <ThemeToggleIcons className="shrink-0" />
            </>
          )}
        </div>
      </header>
      <div
        className="shrink-0 transition-[height] duration-300 ease-out"
        style={{
          height: topBarCompact
            ? "calc(2.75rem + env(safe-area-inset-top, 0px))"
            : "calc(5.5rem + env(safe-area-inset-top, 0px))",
        }}
        aria-hidden
      />

      {/* Weekly Calendar */}
      <section className="px-4 pb-3 pt-1">
        <WeeklyCalendar />
      </section>

      {showDashboardSkeleton ? (
        <HomeDashboardSkeleton />
      ) : (
        <>
          {/* 최상단: AI 팩폭 + 콤팩트 칼로리 게이지 */}
          <section className="space-y-3 px-4 pb-4 pt-2">
            {!authLoading && userId ? (
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
                compact
                className="mx-0"
              />
            ) : null}
            <CalorieGauge
              current={totalCalories}
              target={target}
              macros={macroTotals}
              compact={false}
              mealCount={meals.length}
            />
          </section>

          {/* 자주 찾는 식단 (가로 스토리 스크롤) */}
          {userId ? (
            <QuickLogSlider
              items={quickLogItems}
              isLoading={frequentMealsPending}
              busyId={quickLogBusyId}
              onPick={handleQuickLogPick}
              onOpenCamera={openCameraPicker}
              onOpenManual={() => setManualOpen(true)}
              onAddFrequent={() => {
                setFrequentEditorInitial(null);
                setFrequentEditorOpen(true);
              }}
              onEditFrequent={(item) => {
                setFrequentEditorInitial(item);
                setFrequentEditorOpen(true);
              }}
            />
          ) : null}

          <section className="px-4 pb-4 pt-3">
            <div className="mb-3">
              <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                <UtensilsCrossed
                  className="h-4 w-4 shrink-0 text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
                오늘 먹은 것
              </h2>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                식단 검거 · 타임라인
              </p>
            </div>
            <MealTimeline
              meals={meals}
              onDeleteMeal={userId ? handleDeleteMeal : undefined}
              isDeletingId={mealDeletingId}
            />
          </section>

          {/* 물 + 체중: BAPS 감시본부 2컬럼 */}
          {userId ? (
            <section className="px-4 pb-5 pt-3">
              <div className="mb-3">
                <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Activity
                    className="h-4 w-4 shrink-0 text-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                  수분 · 체중
                </h2>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                  BAPS 감시본부 — 물 잔수와 체중 기록
                </p>
              </div>
              <div className="grid grid-cols-2 items-stretch gap-3">
                <WaterCounter
                  variant="paired"
                  cups={waterLog?.cups ?? 0}
                  cupMl={cupMl}
                  targetCups={waterTargetCups}
                  recommendedMl={waterRecommendedMl}
                  celebrationDateKey={selectedDate}
                  readOnly={false}
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
                <WeightSparkStrip
                  userId={userId}
                  selectedDate={selectedDate}
                  profileKg={profile?.weight ?? null}
                  targetWeightKg={profile?.target_weight ?? null}
                  compact
                  onNavigateToDate={setSelectedDate}
                  onSavedProfile={() =>
                    void queryClient.invalidateQueries({
                      queryKey: ["profile", userId],
                    })
                  }
                />
              </div>
            </section>
          ) : (
            <section className="px-4 pb-5 pt-3">
              <WaterCounter
                cups={waterLog?.cups ?? 0}
                cupMl={cupMl}
                targetCups={waterTargetCups}
                recommendedMl={waterRecommendedMl}
                readOnly
                onIncrement={() => {}}
                onDecrement={() => {}}
              />
            </section>
          )}
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
            selectedDate={selectedDate}
            totalCal={totalCalories}
            targetCal={target}
            macros={macroTotals}
          />
        </>
      ) : null}

      {/* Analyze Modal */}
      <AnalyzeModal
        isOpen={analyzeOpen}
        onClose={() => {
          if (
            analyzeResult &&
            !isSaving &&
            !isAnalyzing
          ) {
            trackBapsEvent("coach_intervention_canceled", {
              surface: "analyze_modal",
              stage: "result_visible_no_save",
            });
          }
          setAnalyzeOpen(false);
        }}
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
        dietContext={{
          targetCal: target,
          currentCal: totalCalories,
          fatGToday: macroTotals.fatG,
        }}
      />

      <FrequentMealEditorModal
        isOpen={frequentEditorOpen}
        onClose={() => setFrequentEditorOpen(false)}
        initial={frequentEditorInitial}
        isSaving={frequentEditorSaving}
        onSave={saveFrequentMealFromEditor}
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

      {toast ? (
        <div
          className={cn(
            "pointer-events-none fixed left-1/2 z-[70] max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-2xl border border-border bg-card/95 px-4 py-3 text-center text-sm font-medium text-foreground shadow-lg backdrop-blur-md",
            userId ? "bottom-24" : "bottom-32"
          )}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {!userId ? (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-20 border-t border-border",
            "bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
          )}
        >
          <div
            className="mx-auto w-full max-w-md px-4 py-4"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <GoogleSignInButtonBlock />
          </div>
        </div>
      ) : null}
    </main>
  );
}
