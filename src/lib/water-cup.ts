/** 물 한 잔 용량 프리셋 (ml) */
export const WATER_CUP_ML_OPTIONS = [200, 250, 500] as const;

export type WaterCupMl = (typeof WATER_CUP_ML_OPTIONS)[number];

export const DEFAULT_WATER_CUP_ML = 250;

export function normalizeWaterCupMl(
  value: number | null | undefined
): WaterCupMl {
  if (
    value === 200 ||
    value === 250 ||
    value === 500
  ) {
    return value;
  }
  return DEFAULT_WATER_CUP_ML;
}
