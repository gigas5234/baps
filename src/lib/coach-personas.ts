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
    description: "의지력 감시",
  },
  {
    id: "nutrition",
    emoji: "🥗",
    label: "영양",
    description: "탄단지",
  },
  {
    id: "exercise",
    emoji: "🏃‍♂️",
    label: "운동",
    description: "활동 환산",
  },
  {
    id: "mental",
    emoji: "🧠",
    label: "멘탈",
    description: "공복·야식",
  },
  {
    id: "roi",
    emoji: "📊",
    label: "가성비",
    description: "kcal 예산",
  },
];

export function parseCoachPersonaId(raw: unknown): CoachPersonaId {
  const s = typeof raw === "string" ? raw.trim() : "";
  if ((COACH_PERSONA_IDS as readonly string[]).includes(s)) {
    return s as CoachPersonaId;
  }
  return DEFAULT_COACH_PERSONA_ID;
}

/** 퀵칩 — 리드 코치 포인트 컬러(좌측 강조·도트) */
export const COACH_QUICK_CHIP_ACCENT: Record<
  CoachPersonaId,
  { border: string; dot: string }
> = {
  diet: {
    border:
      "border border-border/90 border-l-2 border-l-rose-500/40 dark:border-white/12 dark:border-l-rose-400/45",
    dot: "bg-rose-500 dark:bg-rose-400",
  },
  nutrition: {
    border:
      "border border-border/90 border-l-2 border-l-emerald-500/40 dark:border-white/12 dark:border-l-emerald-400/45",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  exercise: {
    border:
      "border border-border/90 border-l-2 border-l-amber-500/40 dark:border-white/12 dark:border-l-amber-400/45",
    dot: "bg-amber-500 dark:bg-amber-400",
  },
  mental: {
    border:
      "border border-border/90 border-l-2 border-l-violet-500/40 dark:border-white/12 dark:border-l-violet-400/45",
    dot: "bg-violet-500 dark:bg-violet-400",
  },
  roi: {
    border:
      "border border-border/90 border-l-2 border-l-indigo-500/40 dark:border-white/12 dark:border-l-indigo-400/45",
    dot: "bg-indigo-500 dark:bg-indigo-400",
  },
};

const VOICE: Record<CoachPersonaId, string> = {
  diet: `역할: **다이어트 감시 드론** (감정 배제).
초점: 목표 대비 **수치 이탈(Deviation)** 포착.
말투: **[검거] [오류] [실패]** 등 단정적 키워드 사용. "~하는 게 좋아요" 금지.
roast: 감정적 비난 대신 **"의지력 0%" "데이터 오염"** 등 시스템 진단 톤으로 압박.
mission: "먹지 마" 혹은 "이걸로 대체" 식의 단답형 명령만 허용.`,

  nutrition: `역할: **영양 성분 분석기**.
초점: 탄단지 성분비의 **생물학적 불균형**.
말투: 실험실 보고서체. "건강" 대신 **"신체 가동률", "근육 이화 작용", "혈당 스파이크"** 등 전문 용어 사용.
roast: **"탄수화물 과부하 포착"**, **"단백질 결핍으로 인한 근손실 진행 중"** 등 현상을 확정적으로 기술.
mission: 수치 최적화를 위한 **정량적 영양 보충** 명령 1개.`,

  exercise: `역할: **활동 환산 엔진**.
초점: 섭취량을 **신체 노동(Labor)**으로 치환.
말투: 냉정한 계산기. "~해보세요" 대신 **"~분간 가동 필수"** 식으로 표현.
roast: **"사과 1개 = 버피 40개 확정"** 처럼 먹은 행위의 대가를 즉각 수치화하여 압박. (의학 처방·운동 프로그램 단정은 금지. 감각적 환산·분·회 수준만.)
mission: **"지금 즉시 15분간 가동"** 등 구체적 활동 명령.`,

  mental: `역할: **생체 리듬 추적기**.
초점: 호르몬 및 심리적 **시스템 오류**.
말투: 심리 상담이 아닌 **회로 분석** 톤. "배고픈 게 아니라 **뇌의 도파민 오류**"임을 지적.
roast: **"가짜 허기 검출"**, **"수면 부채로 인한 식욕 통제 회로 붕괴"** 등 생리적 팩트 폭격.
mission: **"전원 차단(수면)"** 혹은 **"15분간 대기모드 유지"** 명령.
**22:00~05:00**에는 수면·리듬 프레임 우선—**즉시 고강도 운동 강요 금지**. 데이터 없는 심리 단정 금지.`,

  roi: `역할: **칼로리 회계사**.
초점: 자산(Kcal/돈) 대비 **저효율 지출**.
말투: 금융 거래 보고서 톤. "비싸요" 대신 **"자산 낭비", "마이너스 수익률"** 사용.
roast: **"영양가 0%에 예산 과다 지출 포착"**, **"시급 대비 최악의 에너지 가성비"** 등 경제적 손실 강조.
mission: **"지출 동결"** 혹은 **"고효율 대체재 선택"** 명령.
**식비·원화 숫자는 컨텍스트 [meal_spend_optional]에 있을 때만** — 없으면 지어내지 말고 kcal 예산 낭비만 논한다.`,
};

/**
 * Gemini 시스템 프롬프트에 붙는 1:1 코치 음성 블록
 */
export function coachVoicePromptAppend(id: CoachPersonaId): string {
  return `
[1:1 담당 코치 — 이번 응답의 관점·말투·초점]
${VOICE[id]}

위 역할에 맞게 **analysis·roast·mission**(및 스트리밍 태그 블록)의 어조를 조정한다.
출력 형식·스키마·COACH_PERSONA 전역 규칙(데이터만 인용, ** 감싸기 등)은 그대로 유지한다.`;
}

export function coachMeta(id: CoachPersonaId): CoachPersonaMeta {
  return (
    COACH_PERSONAS_UI.find((c) => c.id === id) ?? COACH_PERSONAS_UI[0]
  );
}

/** 채팅 아트리움(첫 진입) — 코치 탭 시 가운데 설명용 */
export const COACH_ATRIUM_BLURB: Record<
  CoachPersonaId,
  { label: string; tagline: string; quoteTpl: string }
> = {
  diet: {
    label: "다이어트 코치",
    tagline: "실시간 칼로리 감시",
    quoteTpl:
      "{name}님의 숟가락 속도까지 체크합니다. 숨길 생각 마세요. 데이터는 다 보고 있습니다.",
  },
  nutrition: {
    label: "영양 코치",
    tagline: "영양소 밸런스 정밀 분석",
    quoteTpl:
      "몸은 정직한 화학 실험실입니다. 쓰레기를 넣고 금이 나오길 바라는 건 도둑놈 심보죠.",
  },
  exercise: {
    label: "운동 코치",
    tagline: "활동량 압박 및 부스터",
    quoteTpl:
      "근육은 배신하지만, {name}님은 매일 근육을 배신하네요. 오늘 흘린 땀이 0g입니까?",
  },
  mental: {
    label: "멘탈 코치",
    tagline: "가짜 배고픔 및 심리 케어",
    quoteTpl:
      "지금 배가 고픈 건가요, 아니면 마음이 허한 건가요? 감정에 속아 입을 벌리지 마세요.",
  },
  roi: {
    label: "가성비 코치",
    tagline: "운동 환산 및 현실 자각",
    quoteTpl:
      "그 간식 하나 태우려면 버피 200개입니다. {name}님의 1시간을 겨우 과자 한 봉지와 바꿀 건가요?",
  },
};

export function personalizeAtriumQuote(
  tpl: string,
  displayName: string
): string {
  const n = displayName.trim() || "회원";
  return tpl.replace(/\{name\}/g, n);
}

/** 아트리움 환영 문단(이름 포함) */
export function buildChatAtriumWelcome(displayName: string): string {
  const n = displayName.trim() || "회원";
  return `반가워요, ${n}님. 오늘도 '내일부터'라는 마법의 주문을 외우고 오신 건 아니죠?\n\n지금 아래의 다섯 코치 중 한 명을 깨워보세요.\n오늘 ${n}님이 무엇을 하셨는지, 냉정하게 분석해 드릴게요.`;
}

/** 아트리움에서 코치만 고른 뒤(대화 스레드 전) 표시 — 서버 칩 수신 전 폴백 */
export type AtriumQuickChip = { label: string; prompt: string };

export const ATRIUM_DEFAULT_QUICK_CHIPS: Record<CoachPersonaId, AtriumQuickChip[]> =
  {
    diet: [
      {
        label: "오늘 섭취 팩트 평가",
        prompt: "오늘 기록된 섭취를 팩트로 짧게 평가해줘.",
      },
      {
        label: "목표 대비 지금 상태",
        prompt: `오늘 목표 칼로리 대비 지금 어떤 상태인지 숫자로 말해줘.`,
      },
      {
        label: "야식 욕구 차단",
        prompt:
          "야식 욕구가 올 때 바로 끊을 수 있는 대체 행동 하나만 명령해.",
      },
    ],
    nutrition: [
      {
        label: "탄단지 밸런스",
        prompt: "오늘 탄단지 비율이 균형 잡혀 있는지 팩트로 짚어줘.",
      },
      {
        label: "단백질 보충 2가지",
        prompt: "단백질이 부족하면 보충할 만한 음식을 딱 2가지만 말해줘.",
      },
      {
        label: "혈당 스파이크 점검",
        prompt: "혈당 스파이크가 올 수 있는 식사를 냉정하게 분석해줘.",
      },
    ],
    exercise: [
      {
        label: "먹은 만큼 환산",
        prompt:
          "오늘 활동량을 오늘 먹은 칼로리 기준으로 환산하면 얼마나 움직여야 하는지 말해줘.",
      },
      {
        label: "15분 운동 하나",
        prompt: "지금 15분 안에 할 수 있는 운동 하나만 명령해.",
      },
      {
        label: "게으름 수치화",
        prompt: "오늘 기록이 목표 대비 얼마나 게으른지 숫자로 말해줘.",
      },
    ],
    mental: [
      {
        label: "진짜 허기 vs 심리",
        prompt: "지금 배고픔이 진짜 허기인지 심리적 각인인지 팩트로 판독해줘.",
      },
      {
        label: "야식 멘탈 루틴",
        prompt: "야식 욕구가 올 때 바로 끊는 멘탈 루틴 하나만.",
      },
      {
        label: "수면·스트레스 영향",
        prompt: "오늘 수면·스트레스가 식욕에 영향 줬는지 짧게 짚어줘.",
      },
    ],
    roi: [
      {
        label: "간식 = 운동 몇 분",
        prompt: "오늘 먹은 간식을 칼로리로만 보면 운동으로 몇 분이야?",
      },
      {
        label: "시급 대비 식사 가성비",
        prompt: "시급 대비 오늘 식사 가성비가 나는지 냉정하게 분석해줘.",
      },
      {
        label: "남은 예산 한 끼",
        prompt: "남은 칼로리 예산으로 최적의 한 끼를 뭐로 먹을지 고민해줘.",
      },
    ],
  };

export function getAtriumDefaultQuickChips(
  id: CoachPersonaId
): AtriumQuickChip[] {
  return (
    ATRIUM_DEFAULT_QUICK_CHIPS[id] ??
    ATRIUM_DEFAULT_QUICK_CHIPS[DEFAULT_COACH_PERSONA_ID]
  );
}

/**
 * Azure TTS `ko-KR` Neural 보이스 이름 (Language support 표).
 * HD(`:DragonHDLatestNeural`)·다국어 보이스는 리전·리소스 SKU에 따라 404/거절될 수 있음.
 * 전체 미리듣기: https://speech.microsoft.com/portal/voicegallery
 */
export const AZURE_KO_KR_NEURAL_VOICE_NAMES = [
  "ko-KR-BongJinNeural",
  "ko-KR-GookMinNeural",
  "ko-KR-HyunsuNeural",
  "ko-KR-HyunsuMultilingualNeural",
  "ko-KR-InJoonNeural",
  "ko-KR-JiMinNeural",
  "ko-KR-SeoHyeonNeural",
  "ko-KR-SoonBokNeural",
  "ko-KR-SunHiNeural",
  "ko-KR-YuJinNeural",
  "ko-KR-Hyunsu:DragonHDLatestNeural",
  "ko-KR-SunHi:DragonHDLatestNeural",
] as const;

/** Azure Speech ko-KR Neural — 코치 페르소나별 보이스·말 속도(SSML prosody rate) */
export type CoachNeuralTtsConfig = {
  voiceName: string;
  /**
   * SSML `<prosody rate="…">` — `medium`, `+10%`, `-15%` 등
   * @see https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-voice
   */
  prosodyRate: string;
};

/**
 * 코치별 Azure Neural 보이스·말 속도.
 * 전체적으로 느리게 느껴지면 `prosodyRate`를 `+6%`~`+12%` 단위로 올리면 됨.
 */
export const COACH_NEURAL_TTS: Record<CoachPersonaId, CoachNeuralTtsConfig> =
  {
    /** 다이어트(감시) — 단호·정직·남성 */
    diet: { voiceName: "ko-KR-BongJinNeural", prosodyRate: "+22%" },
    /** 영양(분석) — 차분·논리·여성 */
    nutrition: { voiceName: "ko-KR-SunHiNeural", prosodyRate: "+12%" },
    /** 운동(격려) — 에너지·밝은 남성 */
    exercise: { voiceName: "ko-KR-GookMinNeural", prosodyRate: "+18%" },
    /** 멘탈(위로) — 부드럽고 따뜻한 여성 (너무 느리지 않게 표준보다 약간만 낮게) */
    mental: { voiceName: "ko-KR-YuJinNeural", prosodyRate: "-4%" },
    /** 가성비(현실) — 신뢰·이성·남성 */
    roi: { voiceName: "ko-KR-InJoonNeural", prosodyRate: "+5%" },
  };

export function coachNeuralTts(id: CoachPersonaId): CoachNeuralTtsConfig {
  return COACH_NEURAL_TTS[id] ?? COACH_NEURAL_TTS.diet;
}

/** 카톡형 원형 아바타 배경 (Clinical: 인디고/바이올렛 링) */
export const COACH_AVATAR_SURFACE: Record<CoachPersonaId, string> = {
  diet:
    "bg-gradient-to-br from-rose-600 to-rose-800 ring-2 ring-indigo-500/45 shadow-md shadow-black/20",
  nutrition:
    "bg-gradient-to-br from-emerald-600 to-emerald-900 ring-2 ring-violet-500/40 shadow-md shadow-black/20",
  exercise:
    "bg-gradient-to-br from-amber-600 to-orange-800 ring-2 ring-indigo-400/40 shadow-md shadow-black/20",
  mental:
    "bg-gradient-to-br from-violet-600 to-indigo-900 ring-2 ring-purple-400/40 shadow-md shadow-black/20",
  roi: "bg-gradient-to-br from-indigo-600 to-blue-900 ring-2 ring-indigo-300/45 shadow-md shadow-black/20",
};

/** TTS 재생 중 말풍선·이모지에 얹는 네온(코치 톤에 맞춘 색) */
export type CoachTtsVisualAccent = {
  bubble: string;
  emoji: string;
};

export const COACH_TTS_VISUAL: Record<CoachPersonaId, CoachTtsVisualAccent> = {
  diet: {
    bubble:
      "z-[1] ring-2 ring-rose-400/80 shadow-[0_0_24px_rgba(244,63,94,0.42),inset_0_0_14px_rgba(244,63,94,0.12)] dark:shadow-[0_0_26px_rgba(251,113,133,0.38)]",
    emoji: "drop-shadow-[0_0_10px_rgba(244,63,94,0.95)] saturate-[1.3] contrast-[1.05]",
  },
  nutrition: {
    bubble:
      "z-[1] ring-2 ring-emerald-400/75 shadow-[0_0_24px_rgba(16,185,129,0.38),inset_0_0_12px_rgba(16,185,129,0.1)] dark:shadow-[0_0_26px_rgba(52,211,153,0.36)]",
    emoji: "drop-shadow-[0_0_10px_rgba(16,185,129,0.9)] saturate-[1.25]",
  },
  exercise: {
    bubble:
      "z-[1] ring-2 ring-amber-400/85 shadow-[0_0_24px_rgba(245,158,11,0.45),inset_0_0_12px_rgba(245,158,11,0.12)] dark:shadow-[0_0_26px_rgba(251,191,36,0.4)]",
    emoji: "drop-shadow-[0_0_10px_rgba(245,158,11,0.95)] saturate-[1.35] brightness-[1.03]",
  },
  mental: {
    bubble:
      "z-[1] ring-2 ring-violet-400/78 shadow-[0_0_24px_rgba(139,92,246,0.4),inset_0_0_12px_rgba(139,92,246,0.11)] dark:shadow-[0_0_26px_rgba(167,139,250,0.38)]",
    emoji: "drop-shadow-[0_0_10px_rgba(139,92,246,0.92)] saturate-[1.2]",
  },
  roi: {
    bubble:
      "z-[1] ring-2 ring-indigo-400/78 shadow-[0_0_24px_rgba(99,102,241,0.4),inset_0_0_12px_rgba(99,102,241,0.11)] dark:shadow-[0_0_26px_rgba(129,140,248,0.38)]",
    emoji: "drop-shadow-[0_0_10px_rgba(99,102,241,0.92)] saturate-[1.15]",
  },
};

export const TTS_ANALYSIS_VISUAL: CoachTtsVisualAccent = {
  bubble:
    "z-[1] ring-2 ring-indigo-400/75 shadow-[0_0_22px_rgba(99,102,241,0.38),inset_0_0_12px_rgba(99,102,241,0.1)]",
  emoji: "drop-shadow-[0_0_9px_rgba(129,140,248,0.88)] saturate-[1.15]",
};

export const TTS_MISSION_VISUAL: CoachTtsVisualAccent = {
  bubble:
    "z-[1] ring-2 ring-amber-400/90 shadow-[0_0_26px_rgba(245,158,11,0.48),inset_0_0_14px_rgba(245,158,11,0.14)] dark:ring-amber-300/70",
  emoji: "drop-shadow-[0_0_11px_rgba(245,158,11,0.95)] saturate-[1.35]",
};
