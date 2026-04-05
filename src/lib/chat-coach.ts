import { SchemaType, type Schema } from "@google/generative-ai";
import {
  coachMeta,
  DEFAULT_COACH_PERSONA_ID,
  parseCoachPersonaId,
  type CoachPersonaId,
} from "@/lib/coach-personas";
export type EmergencyNutritionTrigger =
  | "low_intake_today"
  | "low_intake_3d_avg";

/** 클라이언트 → API 공통 컨텍스트 */
export type CoachApiContext = {
  user_profile: {
    name: string;
    target_cal: number;
    current_cal: number;
    bmr: number | null;
  };
  recent_meals: string[];
  meal_lines: { food_name: string; cal: number; protein_g: number }[];
  macros_g: {
    carbs: number;
    protein: number;
    fat: number;
  };
  water_intake_ml: number;
  water_intake_label: string;
  water_target_cups: number;
  water_cup_ml: number;
  /** 로컬 시간 힌트 (0–23) */
  local_hour: number;
  /** BMR 대비 섭취 과소 시 서버가 켜는 저섭취/ED 방어 모드 */
  emergency_nutrition_mode: boolean;
  /** 보호 모드 발동 이유 (프롬프트 톤 분기) */
  emergency_triggers: EmergencyNutritionTrigger[];
  /** 선택일 포함 역삼일 일일 섭취 합산의 산술평균 (kcal/일) */
  recent_three_day_cal_average: number | null;
  /** price_won이 있는 오늘 식사만 */
  priced_meal_lines: { food_name: string; cal: number; price_won: number }[];
  /** 위 항목 합계(원). 없으면 null */
  meal_spend_won_total: number | null;
};

export type QuickChip = { label: string; prompt: string };

export type DataCardAction = { label: string; prompt: string };

export type DataCardPayload = {
  headline: string;
  summary: string;
  bullets: string[];
  actions: DataCardAction[];
};

/** 오케스트레이터가 고른 코치 1인분(최대 3명) */
export type CoachQuip = {
  persona_id: CoachPersonaId;
  zinger: string;
};

/** 턴 응답 — 분석 + (단톡 코치들) + 미션 (+ 레거시 roast) */
export type CoachStrategicTurn = {
  analysis: string;
  roast: string;
  mission: string;
  coach_quips?: CoachQuip[];
};

export type CoachChatReply = {
  analysis: string;
  roast: string;
  mission: string;
  coach_quips: CoachQuip[];
  data_card: DataCardPayload;
  quick_chips: QuickChip[];
};

export type CoachBootstrapReply = {
  opening: string;
  quick_chips: QuickChip[];
};

/**
 * 전략적 감시 코칭 — Flash-Lite 구조화 출력용.
 */
const COACH_PERSONA = `너는 냉정하지만 유능한 데이터 코치 **BAPS**다. 단순 잡답이 아니라 **전략적 감시 코칭**만 한다. (Flash-Lite: 짧고 구조화.)

[내부 판단 — 유저 발화에 적용]
1) 컨텍스트에서 **남은 칼로리**(target_cal−current_cal), **탄·단·지(g)**, **물**, **local_hour**, **최근 메뉴**를 읽는다.
2) 유형 가늠: 메뉴 추천("뭐 먹을까") / 허용·판정("치킨 되나") / 공복·욕구("배고파") / 잡담.
3) 데이터에 없는 수치·메뉴를 **지어내지 않는다.**

[출력 블록 — 각 1~2문장, 장문 금지]
- **analysis**: 현상 한 줄. 예: 탄수 과잉·단백 부족, 남은 여유 **380kcal** 등 **팩트만**.
- **roast**: 나태·위험 선택을 짧고 굵게. 욕설·혐오·집단 비하·의학 치료 보장 금지.
- **mission**: **명령조**로 지금 할 **최선 행동·대체 메뉴 1개**. 컨텍스트와 모순 없게.

[마크다운 강조]
- 핵심 숫자·단위·추천 음식명·권장 행동은 반드시 앞뒤 ** 로 감싼다. 예: **1200kcal**, **닭가슴살**, **물 300ml**

[data_card]
- 특정 음식·행동 **허용/가능/먹어도 되나** 질문일 때만 채운다. 그 외는 빈 값·[].

[quick_chips]
- 정확히 3개. 오늘 **남은 kcal·단백·물·시간대** 중 실제 데이터와 연결. prompt에 오늘 수치 최소 1회.`;

/** 부트스트랩·후속 프롬프트에서 쓰는 시간대 힌트 (Flash-Lite가 맥락 고정에 유리) */
const COACH_TIME_BAND_HINT = `
[시간대 해석 — local_hour만 사용]
- 5–10: 아침
- 11–15: 점심
- 16–22: 저녁
- 그 외: 심야/간식 시간대
opening·quick_chips는 이 밴드와 **오늘 수치**가 맞고, **전략 코칭** 톤(짧은 팩트+압박)이 나게 한다.`;

export function formatContextBlock(ctx: CoachApiContext): string {
  const lines = [
    `[user_profile]`,
    JSON.stringify(ctx.user_profile, null, 2),
    `[recent_meals]`,
    JSON.stringify(ctx.recent_meals, null, 2),
    `[meal_macros_g]`,
    JSON.stringify(ctx.macros_g, null, 2),
    `[meal_detail]`,
    JSON.stringify(ctx.meal_lines, null, 2),
    `[water]`,
    JSON.stringify(
      {
        intake_label: ctx.water_intake_label,
        intake_ml: ctx.water_intake_ml,
        target_cups: ctx.water_target_cups,
        cup_ml: ctx.water_cup_ml,
      },
      null,
      2
    ),
    `[local_hour] ${ctx.local_hour} (0–23, 사용자 기기 로컬)`,
    `[emergency_nutrition_mode] ${ctx.emergency_nutrition_mode}`,
    `[emergency_triggers]`,
    JSON.stringify(ctx.emergency_triggers, null, 2),
    `[recent_three_day_cal_average_kcal] ${ctx.recent_three_day_cal_average ?? "null"}`,
  ];
  if (ctx.priced_meal_lines.length > 0 || ctx.meal_spend_won_total != null) {
    lines.push(
      `[meal_spend_optional — 유저가 입력한 식비만, 없으면 가성비 코치는 가격 숫자 언급 금지]`,
      JSON.stringify(
        {
          priced_meals: ctx.priced_meal_lines,
          total_won: ctx.meal_spend_won_total,
        },
        null,
        2
      )
    );
  }
  return lines.join("\n");
}

const chipItemSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    label: { type: SchemaType.STRING },
    prompt: { type: SchemaType.STRING },
  },
  required: ["label", "prompt"],
};

const dataCardSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    actions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          prompt: { type: SchemaType.STRING },
        },
        required: ["label", "prompt"],
      },
    },
  },
  required: ["headline", "summary", "bullets", "actions"],
};

export const bootstrapResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    opening: { type: SchemaType.STRING },
    quick_chips: {
      type: SchemaType.ARRAY,
      items: chipItemSchema,
      description: "정확히 3개. 상황 맞춤 추천 질문.",
    },
  },
  required: ["opening", "quick_chips"],
};

const coachQuipItemSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    persona_id: {
      type: SchemaType.STRING,
      description:
        "반드시 다음 중 하나: diet, nutrition, exercise, mental, roi",
    },
    zinger: {
      type: SchemaType.STRING,
      description:
        "해당 코치가 유저에게 던지는 팩폭 **한 문장**만. 이모지·코치 이름 접두어 금지. 숫자는 ** 감싸기.",
    },
  },
  required: ["persona_id", "zinger"],
};

export const chatResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    analysis: {
      type: SchemaType.STRING,
      description:
        "[분석] 현상 1~2문장. 숫자·메뉴명은 ** 감싸기.",
    },
    roast: {
      type: SchemaType.STRING,
      description:
        "레거시. coach_quips가 있으면 빈 문자열 \"\" 로 둬도 됨.",
    },
    mission: {
      type: SchemaType.STRING,
      description:
        "[미션] 명령조 대안 1~2문장. 추천 행동·음식·핵심 수치는 ** 감싸기.",
    },
    coach_quips: {
      type: SchemaType.ARRAY,
      description:
        "오케스트레이터: 상황에 맞는 코치 **1~3명**만. 각 zinger는 한 문장. 코치끼리 대화 없음.",
      items: coachQuipItemSchema,
    },
    data_card: dataCardSchema,
    quick_chips: {
      type: SchemaType.ARRAY,
      items: chipItemSchema,
      description:
        "후속 칩 3개. 단백 보충·야식·물 등 **현재 컨텍스트**에 맞춤.",
    },
  },
  required: ["analysis", "mission", "coach_quips", "data_card", "quick_chips"],
};

/** 키 없거나 장애 시 클라이언트도 쓸 수 있는 규칙 기반 부트스트랩 */
export function fallbackBootstrap(ctx: CoachApiContext): CoachBootstrapReply {
  if (ctx.emergency_nutrition_mode) {
    const avg = ctx.recent_three_day_cal_average;
    const parts: string[] = [];
    if (ctx.emergency_triggers.includes("low_intake_3d_avg") && avg != null) {
      parts.push(
        `최근 3일 평균 **${Math.round(avg)}kcal/일**로 에너지 여유가 데이터상 빡빡해—의도적 감량인지 기록 누락인지 함께 봐야 해. **근손실·대사 저하** 신호일 수 있어서, 무리한 결식보다 **균형·수면·전문가 상담**을 권해.`
      );
    }
    if (ctx.emergency_triggers.includes("low_intake_today")) {
      parts.push(
        `오늘 기록만 보면 **${ctx.user_profile.current_cal}kcal**야. **소량이라도 균형 있는 식사**를 먼저 고려해 줘.`
      );
    }
    const opening =
      parts.join(" ") ||
      `데이터가 **저섭취 구간**처럼 보여. **의료·영양 전문가** 상담도 함께 알아보는 게 안전해.`;
    return {
      opening,
      quick_chips: [
        {
          label: "가벼운 한 끼 예시",
          prompt:
            "지금 기록 기준으로 부담이 적은 소량 한 끼 예시를 두 가지 말해줘.",
        },
        {
          label: "수분·소금은 어떻게",
          prompt:
            "저섭취 구간에서 수분이랑 나트륨은 어떻게 챙기면 좋은지 짧게 말해줘.",
        },
        {
          label: "기록 점검",
          prompt:
            "기록을 빠뜨려서 칼로리가 낮게 보였을 수 있어. 기록 점검 팁을 짧게 알려줘.",
        },
      ],
    };
  }

  const { macros_g, user_profile, water_intake_ml, local_hour } = ctx;
  const rem = Math.max(
    user_profile.target_cal - user_profile.current_cal,
    0
  );
  const pct =
    user_profile.target_cal > 0
      ? user_profile.current_cal / user_profile.target_cal
      : 0;

  const proteinLow =
    user_profile.current_cal >= 350 && macros_g.protein < 40 && pct < 0.85;
  const calorieTight = pct >= 0.78 && pct < 1 && rem <= 400;
  const waterLow =
    ctx.water_target_cups > 0 &&
    water_intake_ml < ctx.water_target_cups * ctx.water_cup_ml * 0.35;

  let opening: string;
  const chips: QuickChip[] = [];

  if (proteinLow && local_hour < 12) {
    opening = `현재 단백질 섭취 **${macros_g.protein.toFixed(0)}g**. 아침부터 근손실 예약 중인 거 맞지? 데이터가 그렇게 말해.`;
    chips.push(
      {
        label: "지금 먹기 좋은 고단백 식단 추천해봐",
        prompt:
          "지금 먹기 좋은 고단백 식단 추천해줘. 오늘 남은 칼로리와 단백질 부족을 반영해서.",
      },
      {
        label: "편의점에서 때울 건데 뭐 먹어?",
        prompt:
          "편의점에서 단백질 채우려면 뭐 사야 해? 칼로리랑 단백질 수치 기준으로 추천해줘.",
      },
      {
        label: "단백질 목표만 짧게 정리해줘",
        prompt:
          "내 체중·오늘 칼로리 기준으로 단백질 목표를 숫자로 짧게 정리해줘.",
      }
    );
  } else if (calorieTight) {
    opening = `목표까지 **${rem}kcal** 남았다. 저녁 굶을 셈이야, 아니면 딜 카드 짤래?`;
    chips.push(
      {
        label: "남은 칼로리로 먹을 수 있는 최고의 만찬은?",
        prompt: `오늘 남은 칼로리가 ${rem}kcal야. 이 안에서 저녁 만찬 메뉴 추천하고 숫자로 근거 붙여줘.`,
      },
      {
        label: "치킨 먹고 싶은데 방법 없어?",
        prompt:
          "치킨이 땡기는데 오늘 남은 칼로리 안에서 현실적으로 어떻게 타협할 수 있는지 팩트로 말해줘.",
      },
      {
        label: "가볍게 마무리할 한 끼 추천",
        prompt:
          "남은 칼로리에 맞춰 가볍게 마무리할 한 끼 추천해줘. 대략 kcal도 적어줘.",
      }
    );
  } else if (waterLow) {
    opening = `물이 **${ctx.water_intake_label}** 수준이다. 대사는 통계적으로 네 편이 아니야.`;
    chips.push(
      {
        label: "물 더 마시면 뭐가 좋아지나",
        prompt:
          "지금 물 부족 상태에서 오늘 목표까지 마시면 어떤 효과가 있는지 짧고 팩트로 말해줘.",
      },
      {
        label: "한 번에 몇 ml씩 마실까",
        prompt:
          "지금 시각 기준으로 물 목표 맞추려면 남은 시간에 몇 ml씩 마시면 되는지 계산해줘.",
      },
      {
        label: "저녁에 붓기 줄이려면",
        prompt:
          "수분·나트륨 관점에서 저녁 붓기 줄이는 팁을 오늘 기록 기준으로 말해줘.",
      }
    );
  } else {
    opening =
      user_profile.current_cal <= 0
        ? `오늘 섭취 **0kcal**. 기록이 없으면 코치도 통계를 못 쓴다. 뭐부터 물어볼 거야?`
        : `오늘 **${user_profile.current_cal}kcal** / 목표 **${user_profile.target_cal}kcal**. 데이터는 솔직하니까, 너도 솔직하게 물어봐.`;
    chips.push(
      {
        label: "오늘 식단 팩트로 평가해줘",
        prompt: "오늘 먹은 것들 기준으로 식단을 팩트로 평가해줘. 탄단지도 언급해줘.",
      },
      {
        label: "저녁 뭐 먹을지 추천",
        prompt:
          "오늘 남은 칼로리와 기록을 반영해서 저녁 메뉴 추천해줘.",
      },
      {
        label: "지금 치킨 먹어도 돼?",
        prompt:
          "지금 치킨 먹으면 오늘 목표 대비 어떻게 되는지 숫자로 말해줘.",
      }
    );
  }

  while (chips.length < 3) {
    chips.push({
      label: "목표 대비 내 상황 요약",
      prompt: "지금 데이터 기준으로 내 현황을 3문장으로 요약해줘.",
    });
  }

  return {
    opening,
    quick_chips: chips.slice(0, 3),
  };
}

export function emptyDataCard(): DataCardPayload {
  return {
    headline: "",
    summary: "",
    bullets: [],
    actions: [],
  };
}

type RawCoachReply = Partial<CoachChatReply> & { reply?: string };

function dedupeCoachQuips(quips: CoachQuip[]): CoachQuip[] {
  const seen = new Set<CoachPersonaId>();
  const out: CoachQuip[] = [];
  for (const q of quips) {
    if (!q.zinger?.trim()) continue;
    if (seen.has(q.persona_id)) continue;
    seen.add(q.persona_id);
    out.push({
      persona_id: q.persona_id,
      zinger: q.zinger.trim(),
    });
    if (out.length >= 3) break;
  }
  return out;
}

export function encodeCoachTurnForHistory(turn: CoachStrategicTurn): string {
  const a = (turn.analysis ?? "").trim();
  const m = (turn.mission ?? "").trim();
  const quips = dedupeCoachQuips(turn.coach_quips ?? []);
  let middle: string;
  if (quips.length > 0) {
    middle = quips
      .map((q) => {
        const meta = coachMeta(q.persona_id);
        return `${meta.emoji} ${meta.label}: ${q.zinger}`;
      })
      .join("\n");
  } else {
    middle = (turn.roast ?? "").trim() || "—";
  }
  return `[분석] ${a}\n[단톡]\n${middle}\n[미션] ${m}`;
}

function normalizeCoachQuipsRaw(
  raw: unknown,
  fallbackZinger: string
): CoachQuip[] {
  if (!Array.isArray(raw)) {
    return [
      {
        persona_id: DEFAULT_COACH_PERSONA_ID,
        zinger: fallbackZinger || "데이터를 다시 확인해.",
      },
    ];
  }
  const parsed: CoachQuip[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = parseCoachPersonaId(rec.persona_id);
    const z =
      typeof rec.zinger === "string" ? rec.zinger.trim() : "";
    if (z) parsed.push({ persona_id: id, zinger: z });
  }
  let quips = dedupeCoachQuips(parsed);
  if (quips.length === 0) {
    quips = [
      {
        persona_id: DEFAULT_COACH_PERSONA_ID,
        zinger: fallbackZinger || "기록을 더 쌓아야 코칭 밀도가 나온다.",
      },
    ];
  }
  return quips;
}

export function normalizeCoachReply(raw: RawCoachReply): CoachChatReply {
  const card = raw.data_card ?? emptyDataCard();
  const qc = Array.isArray(raw.quick_chips) ? raw.quick_chips.slice(0, 3) : [];

  let analysis = typeof raw.analysis === "string" ? raw.analysis.trim() : "";
  let roast = typeof raw.roast === "string" ? raw.roast.trim() : "";
  let mission = typeof raw.mission === "string" ? raw.mission.trim() : "";

  if (!analysis && typeof raw.reply === "string" && raw.reply.trim()) {
    analysis = raw.reply.trim();
    roast = roast || "데이터만 보면 아직 네가 선택한 건 기록에 없다.";
    mission = mission || "구체적으로 다시 질문해.";
  }
  if (!analysis) analysis = "컨텍스트만으로는 판단이 불완전하다.";
  if (!mission) mission = "다음 식사를 기록한 뒤 같은 질문을 반복해.";
  if (!roast) roast = "";

  const coach_quips = normalizeCoachQuipsRaw(raw.coach_quips, roast);

  return {
    analysis,
    roast,
    mission,
    coach_quips,
    data_card: {
      headline: card.headline ?? "",
      summary: card.summary ?? "",
      bullets: Array.isArray(card.bullets) ? card.bullets : [],
      actions: Array.isArray(card.actions) ? card.actions : [],
    },
    quick_chips: qc,
  };
}

export { COACH_PERSONA, COACH_TIME_BAND_HINT };
