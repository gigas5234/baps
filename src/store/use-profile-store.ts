import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProfileState {
  userName: string;
  bmr: number;
  targetCal: number;
  isOnboarded: boolean;
  setProfile: (profile: {
    userName: string;
    bmr: number;
    targetCal: number;
  }) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      userName: "",
      bmr: 0,
      targetCal: 0,
      isOnboarded: false,
      setProfile: ({ userName, bmr, targetCal }) =>
        set({ userName, bmr, targetCal, isOnboarded: true }),
      reset: () =>
        set({ userName: "", bmr: 0, targetCal: 0, isOnboarded: false }),
    }),
    { name: "baps-profile" }
  )
);
