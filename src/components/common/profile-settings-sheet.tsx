"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import { calculateBMR } from "@/lib/bmr";
import { useProfileStore } from "@/store/use-profile-store";
import type { Gender, Profile } from "@/types/database";

interface ProfileSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  profile: Profile | null | undefined;
  isLoadingProfile: boolean;
  profileQueryError: boolean;
  onRetryProfile: () => void;
}

export function ProfileSettingsSheet({
  isOpen,
  onClose,
  userId,
  profile,
  isLoadingProfile,
  profileQueryError,
  onRetryProfile,
}: ProfileSettingsSheetProps) {
  const queryClient = useQueryClient();
  const setProfileStore = useProfileStore((s) => s.setProfile);

  const [userName, setUserName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [bmrInput, setBmrInput] = useState("");
  const [targetCalInput, setTargetCalInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 한 번 열릴 때 프로필로 폼을 한 번만 채움 (refetch로 객체가 바뀌어도 입력 유지) */
  const hydratedForOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hydratedForOpenRef.current = false;
      return;
    }
    if (!profile || hydratedForOpenRef.current) return;

    setUserName(profile.user_name ?? "");
    setGender((profile.gender as Gender) ?? "male");
    setHeight(profile.height != null ? String(profile.height) : "");
    setWeight(profile.weight != null ? String(profile.weight) : "");
    setAge(profile.age != null ? String(profile.age) : "");
    setBmrInput(profile.bmr != null ? String(profile.bmr) : "");
    setTargetCalInput(
      profile.target_cal != null ? String(profile.target_cal) : ""
    );
    setSaveError(null);
    hydratedForOpenRef.current = true;
  }, [isOpen, profile]);

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const a = parseInt(age, 10);
  const metricsOk = h > 0 && w > 0 && a > 0;
  const computedBmr = metricsOk ? calculateBMR(w, h, a, gender) : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("로그인이 필요해요");

      const trimmedName = userName.trim();
      const bmr = parseInt(bmrInput, 10);
      const targetCal = parseInt(targetCalInput, 10);

      if (!trimmedName) throw new Error("이름을 입력해주세요");
      if (!Number.isFinite(bmr) || bmr <= 0)
        throw new Error("기초대사량을 확인해주세요");
      if (!Number.isFinite(targetCal) || targetCal <= 0)
        throw new Error("목표 칼로리를 확인해주세요");
      if (!metricsOk) throw new Error("키·몸무게·나이를 입력해주세요");

      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          user_name: trimmedName,
          height: h,
          weight: w,
          age: a,
          gender,
          bmr,
          target_cal: targetCal,
        })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (!userId) return;
      const bmr = parseInt(bmrInput, 10);
      const targetCal = parseInt(targetCalInput, 10);
      setProfileStore({
        userName: userName.trim(),
        bmr,
        targetCal,
      });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      onClose();
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full max-w-md max-h-[90vh] flex flex-col bg-background rounded-t-3xl shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">개인 설정</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 hover:bg-muted"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-6">
              {profileQueryError && !profile ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    프로필을 불러오지 못했어요.
                  </p>
                  <button
                    type="button"
                    onClick={onRetryProfile}
                    className="rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    다시 시도
                  </button>
                </div>
              ) : isLoadingProfile && !profile ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">이름</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="표시 이름"
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">성별</span>
                    <div className="flex gap-3">
                      {(["male", "female"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                            gender === g
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:bg-muted"
                          }`}
                        >
                          {g === "male" ? "남성" : "여성"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">키 (cm)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">몸무게 (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">나이</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {metricsOk ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Mifflin-St Jeor 자동 계산
                        </p>
                        <p className="text-lg font-semibold">
                          {computedBmr} <span className="text-sm font-normal">kcal</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBmrInput(String(computedBmr))}
                        className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted"
                      >
                        BMR에 적용
                      </button>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">기초대사량 (BMR)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={bmrInput}
                      onChange={(e) => setBmrInput(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">목표 칼로리 (일)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={targetCalInput}
                      onChange={(e) => setTargetCalInput(e.target.value)}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {saveError ? (
                    <p className="text-sm text-destructive">{saveError}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => {
                      setSaveError(null);
                      saveMutation.mutate();
                    }}
                    className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "저장"
                    )}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
