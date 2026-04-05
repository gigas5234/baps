import { create } from "zustand";

interface MealState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const useMealStore = create<MealState>((set) => ({
  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
