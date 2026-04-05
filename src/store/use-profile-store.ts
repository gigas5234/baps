import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_WATER_CUP_ML } from "@/lib/water-cup";

interface ProfileState {
  userName: string;
  bmr: number;
  targetCal: number;
  /** 서버/로컬 물 1잔 ml */
  waterCupMl: number;
  isOnboarded: boolean;
  setProfile: (profile: {
    userName: string;
    bmr: number;
    targetCal: number;
    waterCupMl?: number | null;
  }) => void;
  setWaterCupMl: (ml: number) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      userName: "",
      bmr: 0,
      targetCal: 0,
      waterCupMl: DEFAULT_WATER_CUP_ML,
      isOnboarded: false,
      setProfile: ({ userName, bmr, targetCal, waterCupMl }) =>
        set((s) => ({
          userName,
          bmr,
          targetCal,
          isOnboarded: true,
          ...(waterCupMl != null
            ? { waterCupMl }
            : {}),
        })),
      setWaterCupMl: (ml) => set({ waterCupMl: ml }),
      reset: () =>
        set({
          userName: "",
          bmr: 0,
          targetCal: 0,
          waterCupMl: DEFAULT_WATER_CUP_ML,
          isOnboarded: false,
        }),
    }),
    {
      name: "baps-profile",
      skipHydration: true,
    }
  )
);
