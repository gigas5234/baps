import type { Gender } from "@/types/database";

/**
 * Mifflin-St Jeor 공식
 * BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + s
 * s = +5 (male), -161 (female)
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number {
  const s = gender === "male" ? 5 : -161;
  return Math.round(10 * weight + 6.25 * height - 5 * age + s);
}
