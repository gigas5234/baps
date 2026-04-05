import { create } from "zustand";

interface MealState {
  selectedDate: string; // YYYY-MM-DD (클라이언트에서 로컬 오늘로 동기화됨)
  setSelectedDate: (date: string) => void;
}

/** SSR·수화 일치용 UTC 일자. 실제 표시는 useLayoutEffect + syncSelectedDateToLocalTodayOnce */
const initialYmdUtc = () => new Date().toISOString().split("T")[0];

export const useMealStore = create<MealState>((set) => ({
  selectedDate: initialYmdUtc(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
