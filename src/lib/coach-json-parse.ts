import type { CoachBootstrapReply, QuickChip } from "@/lib/chat-coach";

/** 스트리밍 합쳐진 문자열에서 JSON 한 덩어리 추출 */
export function stripJsonFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```\s*$/im.exec(t);
  if (fence) return fence[1].trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return t;
}

export function parseCoachJson<T>(raw: string): T {
  const s = stripJsonFences(raw);
  return JSON.parse(s) as T;
}

/** 문자열 안의 `{`·`}`를 무시하고 최상위 JSON 객체 한 덩어리만 추출 */
export function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

const BOOTSTRAP_PARSE_FALLBACK: CoachBootstrapReply = {
  opening: "데이터는 준비됐어. 뭐부터 물어볼래?",
  quick_chips: [
    {
      label: "오늘 식단 평가",
      prompt: "오늘 식단을 팩트로 짧게 평가해줘.",
    },
    {
      label: "남은 칼로리",
      prompt: "남은 칼로리를 숫자로 말해줘.",
    },
    {
      label: "저녁 추천",
      prompt: "저녁에 뭐 먹으면 좋을지 추천해줘.",
    },
  ],
};

function normalizeBootstrapPayload(raw: unknown): CoachBootstrapReply {
  if (!raw || typeof raw !== "object") {
    return {
      opening: BOOTSTRAP_PARSE_FALLBACK.opening,
      quick_chips: BOOTSTRAP_PARSE_FALLBACK.quick_chips.map((c) => ({
        ...c,
      })),
    };
  }
  const o = raw as Record<string, unknown>;
  let opening =
    typeof o.opening === "string"
      ? o.opening.trim()
      : typeof o.reply === "string"
        ? o.reply.trim()
        : "";
  if (!opening) opening = BOOTSTRAP_PARSE_FALLBACK.opening;

  const chips: QuickChip[] = [];
  if (Array.isArray(o.quick_chips)) {
    for (const item of o.quick_chips) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const label = typeof rec.label === "string" ? rec.label.trim() : "";
      const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
      if (label && prompt) chips.push({ label, prompt });
      if (chips.length >= 3) break;
    }
  }
  while (chips.length < 3) {
    chips.push({
      ...BOOTSTRAP_PARSE_FALLBACK.quick_chips[chips.length]!,
    });
  }
  return { opening, quick_chips: chips.slice(0, 3) };
}

/**
 * 부트스트랩 텍스트 스트림 누적본 → opening/quick_chips.
 * 모델이 앞뒤 멘트·불완전 펜스를 붙여도 복구하고, 끝까지 안 되면 기본 인사로 폴백.
 */
export function parseBootstrapStreamLenient(raw: string): CoachBootstrapReply {
  const t = raw.trim();
  if (!t) {
    return {
      opening: BOOTSTRAP_PARSE_FALLBACK.opening,
      quick_chips: BOOTSTRAP_PARSE_FALLBACK.quick_chips.map((c) => ({
        ...c,
      })),
    };
  }

  const candidates = new Set<string>();
  candidates.add(stripJsonFences(t));
  candidates.add(t);

  for (const candidate of candidates) {
    try {
      return normalizeBootstrapPayload(JSON.parse(candidate));
    } catch {
      /* 계속 */
    }
    const extracted = extractFirstJsonObject(candidate);
    if (extracted) {
      try {
        return normalizeBootstrapPayload(JSON.parse(extracted));
      } catch {
        /* 다음 후보 */
      }
    }
  }

  return {
    opening: BOOTSTRAP_PARSE_FALLBACK.opening,
    quick_chips: BOOTSTRAP_PARSE_FALLBACK.quick_chips.map((c) => ({ ...c })),
  };
}
