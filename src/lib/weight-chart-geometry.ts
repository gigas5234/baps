import type { WeightEntry } from "@/lib/weight-local-storage";

export interface ChartPoint {
  x: number;
  y: number;
  date: string;
  kg: number;
}

export interface WeightChartLayout {
  pts: ChartPoint[];
  pathD: string;
  yTarget: number | null;
  minKg: number;
  maxKg: number;
}

/**
 * 날짜 간격에 따라 x(0~100), 체중·목표 포함 범위로 y(0~100).
 * 기록 1개는 가운데 x=50.
 */
export function layoutWeightChart(
  entries: WeightEntry[],
  targetKg: number | null | undefined
): WeightChartLayout {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;

  if (n === 0) {
    return {
      pts: [],
      pathD: "",
      yTarget: null,
      minKg: 0,
      maxKg: 100,
    };
  }

  const times = sorted.map(
    (e) => new Date(`${e.date}T12:00:00`).getTime()
  );
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const tSpanRaw = tMax - tMin;
  /** 한 점이거나 같은 시각이면 가로 전체 쓰지 않고 자연스럽게 펼침 */
  const tSpan = tSpanRaw > 0 ? tSpanRaw : 86400000;

  const kgVals = sorted.map((e) => e.kg);
  if (targetKg != null && Number.isFinite(targetKg) && targetKg > 0) {
    kgVals.push(targetKg);
  }

  let minKg = Math.min(...kgVals);
  let maxKg = Math.max(...kgVals);
  if (maxKg - minKg < 0.25) {
    minKg -= 0.75;
    maxKg += 0.75;
  }
  const vPad = (maxKg - minKg) * 0.12;
  minKg -= vPad;
  maxKg += vPad;

  const yFor = (kg: number) =>
    100 - ((kg - minKg) / (maxKg - minKg)) * 100;

  const pts: ChartPoint[] = sorted.map((e) => {
    const t = new Date(`${e.date}T12:00:00`).getTime();
    const x = n === 1 ? 50 : ((t - tMin) / tSpan) * 100;
    return { x, y: yFor(e.kg), date: e.date, kg: e.kg };
  });

  const yTargetRaw =
    targetKg != null && Number.isFinite(targetKg) && targetKg > 0
      ? yFor(targetKg)
      : null;
  const yTarget =
    yTargetRaw != null
      ? Math.min(100, Math.max(0, yTargetRaw))
      : null;

  const pathD = smoothWeightPath(pts);

  return { pts, pathD, yTarget, minKg, maxKg };
}

/** Catmull–Rom 스타일 곡선 (2점은 직선, 1점은 빈 path). */
export function smoothWeightPath(pts: ChartPoint[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i > 0 ? i - 1 : i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}
