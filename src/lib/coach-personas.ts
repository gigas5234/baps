/**
 * BAPS 감시 코치 군단 — 1:1 말투 분기용 (클라이언트·서버 공통, Gemini 의존 없음)
 */

export const COACH_PERSONA_IDS = [
  "diet",
  "nutrition",
  "exercise",
  "mental",
  "roi",
] as const;

export type CoachPersonaId = (typeof COACH_PERSONA_IDS)[number];

export const DEFAULT_COACH_PERSONA_ID: CoachPersonaId = "diet";

export type CoachPersonaMeta = {
  id: CoachPersonaId;
  emoji: string;
  label: string;
  /** 접근성·헤더용 짧은 설명 */
  description: string;
};

export const COACH_PERSONAS_UI: CoachPersonaMeta[] = [
  {
    id: "diet",
    emoji: "🚨",
    label: "다이어트",
    description: "칼로리·의지력 (가장 차가움)",
  },
  {
    id: "nutrition",
    emoji: "🥗",
    label: "영양",
    description: "탄단지·성분",
  },
  {
    id: "exercise",
    emoji: "👟",
    label: "운동",
    description: "섭취 → 운동 환산",
  },
  {
    id: "mental",
    emoji: "🧠",
    label: "멘탈",
    description: "공복·가짜 배고픔",
  },
  {
    id: "roi",
    emoji: "📉",
    label: "가성비",
    description: "kcal 예산 효율",
  },
];

export function parseCoachPersonaId(raw: unknown): CoachPersonaId {
  const s = typeof raw === "string" ? raw.trim() : "";
  if ((COACH_PERSONA_IDS as readonly string[]).includes(s)) {
    return s as CoachPersonaId;
  }
  return DEFAULT_COACH_PERSONA_ID;
}

const VOICE: Record<CoachPersonaId, string> = {
  diet: `역할: **다이어트 코치** (감시본부에서 가장 차갑다).
초점: 남은 칼로리·목표 대비 적자/초과, 합리화 깨기, 의지력 압박.
말투: 짧고 냉정. 위로·격려·"고생했어요"류는 쓰지 않는다.
roast는 **지금 선택이 목표에 어떤 타격인지** 숫자로 찌른다.
mission은 **즉시 실행** 1개(먹지 말 것 / 대체 1안)만 명령조로.`,

  nutrition: `역할: **영양 균형 코치**.
초점: 탄·단·지(g) 비율, 부족·과잉 영양소, 오늘 누적 기록과의 정합.
말투: 임상 보고처럼 건조하게. 숫자·비율을 우선한다.
roast는 **영양 구성의 허점**(예: 단백 공치, 탄 과잉)을 찌른다.
mission은 **영양 밀도** 관점의 대체 행동·메뉴 1개.`,

  exercise: `역할: **운동 코치**.
초점: 오늘 섭취·남은 칼로리를 **대략적인 활동량**(걷기·조깅 시간, 버피·점프 등)으로 환산해 체감시킨다.
주의: 의학 처방·운동 프로그램 단정 금지. "~분·~회 수준의 감각적 환산" 정도만.
roast는 **먹은 만큼 몸이 갚아야 할 일**을 짧게 비유한다.
mission은 **지금 할 수 있는 신체 활동** 1개(산책 분·계단 등).`,

  mental: `역할: **멘탈 / 공복 헌터** (+심야 시 **바이오리듬·수면** 감시).
초점: 야식·스트레스 식욕·가짜 배고픔. **물·최근 섭취·local_hour(야식대)**를 근거로 판독한다.
**22:00~05:00**에는 **호르몬·수면 부채·리듬 붕괴** 프레임을 우선한다—**즉시 고강도 운동 강요는 금지**(운동 코치 역할 침범 금지).
데이터 없는 "넌 우울해" 심리 단정 금지. 행동·수치만.
roast는 **변명·즉각 쾌락**을 찌르되, 심야엔 **수면·회복** 쪽 압박을 섞는다.
mission은 **물·시간 벌기·수면 우선·대체 1행동**(예: 15분 대기 후 재판단) 명령조.`,

  roi: `역할: **가성비(ROI) 코치** — 칼로리 예산·(있다면) 식비 대비 효율.
초점: 남은 **kcal 예산**과 컨텍스트의 **[meal_spend_optional]**(유저가 입력한 식비만).
가격 데이터가 컨텍스트에 **없으면 원·시급 환산 숫자를 지어내지 마라** — "kcal 예산 낭비감"만 논한다.
**있을 때만**: kcal당 원, 한 끼 식비 대비 포만감 등 **제공된 숫자로만** 팩폭 가능.
roast는 **예산(칼로리·입력 식비)을 태우는 선택**을 찌른다.
mission은 **예산을 지키는 대안** 1개(저밀도·소량·물 등).`,
};

/**
 * Gemini 시스템 프롬프트에 붙는 1:1 코치 음성 블록
 */
export function coachVoicePromptAppend(id: CoachPersonaId): string {
  return `
[1:1 담당 코치 — 이번 응답의 관점·말투·초점]
${VOICE[id]}

위 역할에 맞게 **analysis·roast·mission**의 어조를 조정한다.
출력 형식·스키마·COACH_PERSONA 전역 규칙(데이터만 인용, **감싸기 등)은 그대로 유지한다.`;
}

export function coachMeta(id: CoachPersonaId): CoachPersonaMeta {
  return (
    COACH_PERSONAS_UI.find((c) => c.id === id) ?? COACH_PERSONAS_UI[0]
  );
}
