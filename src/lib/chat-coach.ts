import { SchemaType, type Schema } from "@google/generative-ai";
import {
  coachMeta,
  DEFAULT_COACH_PERSONA_ID,
  parseCoachPersonaId,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import {
  COACH_STREAM_FALLBACK_MESSAGE,
  coachTextLooksLikeJsonLeak,
} from "@/lib/coach-stream-guard";
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
const COACH_PERSONA = `너는 냉정하고 무미건조한 데이터 관제 시스템 **BAPS**다.
유저를 '케어'하는 것이 아니라, 유저라는 '신체 시스템'의 **결함과 수치를 보고**한다.

[대원칙]
1) **말투**: "~입니다", "~해요" 같은 서술형보다 **"~포착", "~진단", "~확정"** 같은 명사형 종결이나 보고서체를 선호한다.
2) **금지어**: "좋아요", "노력해보세요", "힘내세요", "추천합니다", "건강을 위해".
3) **팩트**: "배고프시죠?"(추측) 대신 **"공복 16시간 경과, 혈당 저하 감지"**(데이터)라고 말한다.
4) **강조**: 핵심 수치와 진단명은 반드시 ** 로 감싼다.

[내부 판단 — 유저 발화에 적용]
1) 컨텍스트에서 **남은 칼로리**(target_cal−current_cal), **탄·단·지(g)**, **물**, **local_hour**, **최근 메뉴**를 읽는다.
2) 유형 가늠: 메뉴 추천("뭐 먹을까") / 허용·판정("치킨 되나") / 공복·욕구("배고파") / 잡담.
3) 데이터에 없는 수치·메뉴를 **지어내지 않는다.**

[출력 블록 규칙]
- **analysis**: [현상 진단] 한 줄. 숫자로 기선을 제압할 것.
- **roast**: [데이터 압박] 유저의 선택이 시스템에 준 타격을 기술. (예: **근손실 유발**, **지방 축적 확정**) 욕설·혐오·집단 비하·의학 치료 보장 금지.
- **mission**: [시스템 명령] 가장 효율적인 단일 행동 명령.

[마크다운 강조]
- 핵심 숫자·단위·추천 음식명·권장 행동은 반드시 앞뒤 ** 로 감싼다. 예: **1200kcal**, **닭가슴살**, **물 300ml**

[data_card]
- 특정 음식·행동 **허용/가능/먹어도 되나** 질문일 때만 채운다. 그 외는 빈 값·[].

[quick_chips 생성 규칙]
- 정확히 3개. **상담형·해요체 라벨 금지.** 진단·감사(Audit)·명령 톤.
- **label**: 심리 압박·호기심을 자극하는 **진단명** 위주 (예: 설계 결함 분석, 예산 탈선 감사, 도파민 회로 오류 판독).
- **prompt**: 반드시 현재 컨텍스트 **수치(kcal, g, ml 등)**를 1회 이상 포함. 추측 멘트 대신 데이터 명령.
- **톤**: 수사·감사·관제. "추천해요" 대신 "명령해" "증명해" "판독해" "찔러".
- **예시 라벨 톤**: "지방 과부하 해결책", "단백질 결핍 복구 작전", "익일 체중 상승 방어", "대사 저하 긴급 복구" — 약한 표현(대사 회복) 대신 **긴급·결함·탈선** 프레임 우선.`;

/** 부트스트랩·후속 프롬프트에서 쓰는 시간대 힌트 (Flash-Lite가 맥락 고정에 유리) */
const COACH_TIME_BAND_HINT = `
[시간대 해석 — local_hour만 사용]
- 5–10: 아침
- 11–15: 점심
- 16–22: 저녁
- 그 외: 심야/간식 시간대
opening·quick_chips는 이 밴드와 **오늘 수치**가 맞고, **관제 보고** 톤(짧은 팩트+압박, 반말·시니컬 허용)이 나게 한다.`;

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
        "정확히 3개. 진단명·감사 톤 label. prompt에 kcal·g·ml 등 오늘 수치 필수. 수사·관제 톤, 상담체 금지.",
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
        `**저섭취 구간** 관제: 최근 3일 평균 **${Math.round(avg)}kcal/일**. 의도적 감량 vs **기록 누락** 감사 필요. **근손실·대사 저하** 신호일 수 있어—무리한 결식 대신 **균형·수면·전문가** 채널을 같이 본다.`
      );
    }
    if (ctx.emergency_triggers.includes("low_intake_today")) {
      parts.push(
        `오늘 기록 **${ctx.user_profile.current_cal}kcal**. 데이터만 보면 에너지 대시보드 **적자**—**소량·균형** 식사를 먼저 넣는 게 관제 프로토콜상 1순위야.`
      );
    }
    const opening =
      parts.join(" ") ||
      `**저섭취 구간** 플래그. 관제 모드에서도 **안전 한도**는 넘지 마라—**의료·영양 전문가** 병행이 기본 룰.`;
    const avgRounded = avg != null ? Math.round(avg) : null;
    return {
      opening,
      quick_chips: [
        {
          label: "기록 누락 vs 실제 적자 감사",
          prompt:
            avgRounded != null
              ? `최근 3일 평균 **${avgRounded}kcal/일**·오늘 **${ctx.user_profile.current_cal}kcal**만 보고 **기록 누락**과 **진짜 저섭취**를 어떻게 감별할지 데이터 관점에서 짧게 명령해.`
              : `오늘 **${ctx.user_profile.current_cal}kcal** 기록만으로 누락 가능성 vs 실제 적자를 어떻게 감사할지 짧게 명령해.`,
        },
        {
          label: "수분·전해질 인상 계획",
          prompt: `지금 체중·오늘 **${Math.round(ctx.water_intake_ml)}ml** 수분 기준으로, 저섭취 구간에서 **ml 단위** 보충·나트륨 각도를 팩트로 짧게 명령해.`,
        },
        {
          label: "균형 한 끼 강제안",
          prompt: `오늘 **${ctx.user_profile.current_cal}kcal**·목표 **${ctx.user_profile.target_cal}kcal** 범위에서 부담 낮은 **균형 한 끼** 후보 2개만 수치 붙여 명령해.`,
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
  const waterTargetMl = ctx.water_target_cups * ctx.water_cup_ml;
  const waterMlRounded = Math.round(water_intake_ml);

  const proteinLow =
    user_profile.current_cal >= 350 && macros_g.protein < 40 && pct < 0.85;
  const calorieTight = pct >= 0.78 && pct < 1 && rem <= 400;
  const waterLow =
    ctx.water_target_cups > 0 && water_intake_ml < waterTargetMl * 0.35;

  let opening: string;
  const chips: QuickChip[] = [];

  if (proteinLow && local_hour < 12) {
    opening = `단백질 **${macros_g.protein.toFixed(0)}g** 확정. 아침부터 **근육 이화** 각이 열렸다—데이터가 먼저 팩폭한다.`;
    chips.push(
      {
        label: "단백질 결핍 복구 작전",
        prompt: `오늘 **${user_profile.current_cal}kcal**·단백 **${macros_g.protein.toFixed(0)}g**·남은 **${rem}kcal** 기준으로 **g 단위** 보충 커맨드 하나만 명령해.`,
      },
      {
        label: "편의점 고단백 강제 집행",
        prompt: `남은 **${rem}kcal** 안에서 편의점 SKU로 단백 **+20g** 이상 찍는 조합을 **kcal·단백 g**로 감사해줘.`,
      },
      {
        label: "단백 목표치 수치 감사",
        prompt: `체중·오늘 섭취 **${user_profile.current_cal}kcal** 기준 **단백질 g 목표**를 한 줄 숫자로 결정해. 변명 없이.`,
      }
    );
  } else if (calorieTight) {
    opening = `목표까지 **${rem}kcal**. 예산 **바닥**—오늘 저녁은 **설계 결함** 안 나게 짜라.`;
    chips.push(
      {
        label: "잔여 예산 최적 배분",
        prompt: `남은 **${rem}kcal**를 가장 효율적으로 태울 수 있는 고효율 식단 **하나만** 명령해. 탄단지 **g**도 붙여.`,
      },
      {
        label: "치킨 섭취 시 타격 예측",
        prompt:
          "지금 치킨을 먹었을 때 내일 아침 체중과 남은 예산 이탈률을 계산해줘.",
      },
      {
        label: "만찬 설계 결함 선제 차단",
        prompt: `오늘 **${rem}kcal** 안에서 만찬 **타이밍·탄단지** 실패 패턴 2개를 찔러줘.`,
      }
    );
  } else if (waterLow) {
    const gapMl = Math.max(0, Math.round(waterTargetMl - water_intake_ml));
    opening = `수분 **${ctx.water_intake_label}**. 지금 **${waterMlRounded}ml** — 대사 보드는 너 편이 아니다.`;
    chips.push(
      {
        label: "대사 저하 긴급 복구",
        prompt: `물 **${waterMlRounded}ml** 즉시 **+250ml** 추가 시 대사·포만 지표 측면 이득을 **수치로 증명**해. 과장 금지.`,
      },
      {
        label: "잔여 수분 예산 분배",
        prompt: `목표 **${Math.round(waterTargetMl)}ml** 대비 남은 **${gapMl}ml**를 지금 시각 기준으로 **시간당 ml**로 쪼개 명령해.`,
      },
      {
        label: "나트륨·붓기 리스크 감사",
        prompt: `오늘 **${waterMlRounded}ml**·식단 컨텍스트로 저녁 **붓기** 리스크를 수분·나트륨 각도에서 팩트로 감사해.`,
      }
    );
  } else {
    opening =
      user_profile.current_cal <= 0
        ? `오늘 섭취 **0kcal** 확정. 기록 공백 = **데이터 파기**. 다음 질의를 입력해라.`
        : `오늘 **${user_profile.current_cal}kcal** 섭취. 시스템은 **당신의 다음 실수**를 대기 중이다.`;
    chips.push(
      {
        label: "오늘의 설계 결함 분석",
        prompt:
          "오늘 기록된 데이터에서 가장 치명적인 결함 3가지만 짚어줘.",
      },
      {
        label: "남은 예산 최적 집행",
        prompt: `목표까지 남은 **${rem}kcal**를 어떻게 써야 '적자'를 면할지 대안을 명령해.`,
      },
      {
        label: "야식 욕구 회로 차단",
        prompt:
          "지금 뭔가 먹고 싶은 게 생리적 허기인지 심리적 오류인지 분석하고 팩폭 날려줘.",
      }
    );
  }

  while (chips.length < 3) {
    chips.push({
      label: "관제 대시 요약",
      prompt: `오늘 **${user_profile.current_cal}kcal** / 목표 **${user_profile.target_cal}kcal** 기준 **3문장** 압축. 변명 없이.`,
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
  if (coachTextLooksLikeJsonLeak(analysis)) {
    analysis = COACH_STREAM_FALLBACK_MESSAGE;
    mission = mission?.trim() || "같은 메시지를 한 번 더 보내보세요.";
  }
  if (coachTextLooksLikeJsonLeak(mission)) {
    mission = "같은 메시지를 한 번 더 보내보세요.";
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
