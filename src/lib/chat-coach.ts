import { SchemaType, type Schema } from "@google/generative-ai";

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
};

export type QuickChip = { label: string; prompt: string };

export type DataCardAction = { label: string; prompt: string };

export type DataCardPayload = {
  headline: string;
  summary: string;
  bullets: string[];
  actions: DataCardAction[];
};

export type CoachChatReply = {
  reply: string;
  data_card: DataCardPayload;
  quick_chips: QuickChip[];
};

export type CoachBootstrapReply = {
  opening: string;
  quick_chips: QuickChip[];
};

/**
 * Gemini 3.1 Flash-Lite Preview에 맞춘 코치 지시.
 * 문서상 강점: 저지연·고빈도·구조화 추출·경량 에이전트·명확히 경계가 있는 작업.
 */
const COACH_PERSONA = `너는 BAPS 앱의 「데이터 기반 팩폭」 다이어트 코치다. 호출 모델은 **Gemini 3.1 Flash-Lite**에 맞게 동작한다.

[Flash-Lite에 맞는 행동 — ai.google.dev 가이드 정렬]
- 이 모델은 **저지연·대량 호출**과 **JSON 구조화 출력·가벼운 데이터 추출**에 최적화되어 있다. 장황한 설교·같은 말 반복·긴 은유는 금지.
- 내부적으로만 다음 순서를 밟는다: (1) 컨텍스트 JSON에서 **읽을 수 있는 사실만** 추출 (2) 유저 발화 유형 분류 — 사실 질문 / 판정·허용 여부 / 추천 요청 / 잡담 (3) **추출한 숫자로만** 결론 (4) 스키마 필드·reply를 채운다.
- 컨텍스트에 **없는** 메뉴명·섭취량·영양수치를 지어내지 마. 없으면 "오늘 기록에는 없다"고 짧게 말한다.

[톤·안전]
- 냉정·직설. 욕설·혐오·집단 비하·의학적 단정(치료·치유 보장) 금지.
- 근거는 오직 제공된 프로필·식사·물 데이터와 대화 내용.

[사용자에게 보이는 답변 규칙]
- reply 본문: **3문장 이내**. 데이터 카드의 summary는 **2문장 이내**.
- **숫자·단위**(예: **455kcal**, **32g**, **1650ml**)는 반드시 ** 로 감싼다.
- 마지막 문장에 **지금 당장 실행 가능한 대안**을 1개 넣는다(구체 수치가 있으면 컨텍스트와 모순되지 않게).`;

/** 부트스트랩·후속 프롬프트에서 쓰는 시간대 힌트 (Flash-Lite가 맥락 고정에 유리) */
const COACH_TIME_BAND_HINT = `
[시간대 해석 — local_hour만 사용]
- 5–10: 아침
- 11–15: 점심
- 16–22: 저녁
- 그 외: 심야/간식 시간대
opening·quick_chips는 이 밴드와 **오늘 수치**가 자연스럽게 맞도록 작성한다.`;

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
  ];
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

export const chatResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: {
      type: SchemaType.STRING,
      description:
        "본 답변. 숫자는 ** 감싸기. 3문장 이내 권장.",
    },
    data_card: dataCardSchema,
    quick_chips: {
      type: SchemaType.ARRAY,
      items: chipItemSchema,
      description: "후속 추천 칩 3개.",
    },
  },
  required: ["reply", "data_card", "quick_chips"],
};

/** 키 없거나 장애 시 클라이언트도 쓸 수 있는 규칙 기반 부트스트랩 */
export function fallbackBootstrap(ctx: CoachApiContext): CoachBootstrapReply {
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

export function normalizeCoachReply(raw: CoachChatReply): CoachChatReply {
  const card = raw.data_card ?? emptyDataCard();
  const qc = Array.isArray(raw.quick_chips) ? raw.quick_chips.slice(0, 3) : [];
  return {
    reply: raw.reply ?? "",
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
