/** Levenshtein 편집 거리 (작은 문자열·캐시 후보만에 사용) */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const cur =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = row[j];
      row[j] = cur;
    }
  }
  return row[n];
}

/** 0~1 (1에 가까울수록 유사). maxLen 0이면 0 */
export function normalizedSimilarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const d = levenshtein(a, b);
  const denom = Math.max(a.length, b.length, 1);
  return Math.max(0, 1 - d / denom);
}
