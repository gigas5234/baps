/** 직접 입력 상단 빠른 선택 한 줄 (비어 있으면 칩 영역 미표시) */
export type MealQuickPreset = {
  id: string;
  label: string;
  hint?: string;
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export const MEAL_QUICK_PRESETS: MealQuickPreset[] = [];
