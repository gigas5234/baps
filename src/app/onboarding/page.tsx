"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { calculateBMR } from "@/lib/bmr";
import { useProfileStore } from "@/store/use-profile-store";
import type { Gender } from "@/types/database";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState<1 | 2>(1);
  const [gender, setGender] = useState<Gender>("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [manualBmr, setManualBmr] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const a = parseInt(age);
  const isStep1Valid = h > 0 && w > 0 && a > 0;

  const calculatedBmr = isStep1Valid ? calculateBMR(w, h, a, gender) : 0;
  const finalBmr = useManual && manualBmr ? parseInt(manualBmr) : calculatedBmr;

  const handleSubmit = async () => {
    if (!finalBmr) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const targetCal = finalBmr; // 기본값: BMR = 목표 (유지 칼로리)

    await supabase
      .from("profiles")
      .update({
        height: h,
        weight: w,
        age: a,
        gender,
        bmr: finalBmr,
        target_cal: targetCal,
        is_onboarded: true,
      })
      .eq("id", user.id);

    setProfile({
      userName: user.user_metadata?.name || "",
      bmr: finalBmr,
      targetCal: targetCal,
    });

    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-10 max-w-sm mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          Step {step} of 2
        </p>
        <div className="flex gap-2 mt-2">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>
      </div>

      {step === 1 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">신체 정보 입력</h1>
            <p className="text-sm text-muted-foreground mt-1">
              정확한 기초대사량 계산을 위해 필요해요
            </p>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-sm font-medium">성별</label>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
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

          {/* Height */}
          <div className="space-y-2">
            <label className="text-sm font-medium">키 (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="170"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <label className="text-sm font-medium">몸무게 (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="70"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <label className="text-sm font-medium">나이</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!isStep1Valid}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-opacity"
          >
            다음
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">기초대사량 확인</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mifflin-St Jeor 공식으로 계산되었어요
            </p>
          </div>

          {/* Calculated BMR */}
          <div className="bg-card border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">나의 기초대사량</p>
            <p className="text-4xl font-bold mt-2">
              {useManual && manualBmr ? manualBmr : calculatedBmr}
            </p>
            <p className="text-sm text-muted-foreground mt-1">kcal / 일</p>
          </div>

          {/* Manual override */}
          <div className="space-y-3">
            <button
              onClick={() => setUseManual(!useManual)}
              className="text-sm text-muted-foreground underline underline-offset-4"
            >
              {useManual ? "자동 계산 사용하기" : "직접 입력할래요"}
            </button>

            {useManual && (
              <input
                type="number"
                inputMode="numeric"
                placeholder="직접 BMR 입력"
                value={manualBmr}
                onChange={(e) => setManualBmr(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 rounded-xl border font-medium text-sm hover:bg-muted transition-colors"
            >
              이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={!finalBmr || saving}
              className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 transition-opacity"
            >
              {saving ? "저장 중..." : "시작하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
