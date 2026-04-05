import {
  COACH_PERSONA,
  COACH_TIME_BAND_HINT,
  formatContextBlock,
  type CoachApiContext,
} from "@/lib/chat-coach";
import { emergencyNutritionGuardPrompt } from "@/lib/coach-safety";
import {
  pickRuleBasedCoachSlots,
  ruleLockedCoachPromptLines,
  lateNightBioRhythmCue,
} from "@/lib/coach-orchestrator-rules";
import {
  coachVoicePromptAppend,
  coachMeta,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import {
  formatInterventionTriggerSummary,
  interventionCodename,
} from "@/lib/coach-intervention-triggers";

function buildTranscript(
  history: { message: string; is_ai: boolean }[]
): string {
  if (!history?.length) return "";
  return history
    .map((h) => `${h.is_ai ? "코치" : "유저"}: ${h.message}`)
    .join("\n");
}

function nightCueIfNeeded(ctx: CoachApiContext): string {
  const h = ctx.local_hour;
  if (h >= 22 || h < 5) return lateNightBioRhythmCue();
  return "";
}

function requiredCoachTag(id: CoachPersonaId): string {
  switch (id) {
    case "diet":
      return "[DIET]";
    case "nutrition":
      return "[NUTRITION]";
    case "exercise":
      return "[EXERCISE]";
    case "mental":
      return "[MENTAL]";
    case "roi":
      return "[ROI]";
    default:
      return "[DIET]";
  }
}

/** 부트스트랩 — JSON 유지 (짧은 응답) */
export function buildAiCoachBootstrapPrompt(
  ctx: CoachApiContext,
  coachId: CoachPersonaId
): string {
  const locked = pickRuleBasedCoachSlots(ctx);
  const lockLines = ruleLockedCoachPromptLines(locked, "bootstrap");
  const guard = ctx.emergency_nutrition_mode
    ? emergencyNutritionGuardPrompt(ctx)
    : "";
  const { emoji, label } = coachMeta(coachId);
  const et = ctx.emergency_triggers ?? [];
  const morningSoftEmergency =
    ctx.local_hour >= 5 &&
    ctx.local_hour < 12 &&
    !et.includes("low_intake_today") &&
    !et.includes("intake_pace_severe");

  return `${COACH_PERSONA}
${guard}
${coachVoicePromptAppend(coachId)}
${COACH_TIME_BAND_HINT}
${nightCueIfNeeded(ctx)}
${lockLines}
${
  ctx.emergency_nutrition_mode && morningSoftEmergency
    ? `
[오전 + 긴급 플래그] opening은 **기아·공포** 대신 **🌅 공복 가동 / ⚡ 연료 주입 대기 / 오늘 작전 수립** 톤. 0kcal·저기록은 「엔진 비어 설계 시작」으로. quick_chips는 **오늘의 첫 끼 추천·공복 운동 가이드·끼니 분배**를 우선(라벨은 진단·감사 톤 유지).`
    : ""
}

[부트스트랩 작업 — 출력 형식]
**반드시** 하나의 JSON 객체만 출력한다. 앞뒤 자연어·코드펜스·설명 금지.

JSON 스키마 형태:
{"opening":"문자열", "quick_chips":[{"label":"문자열","prompt":"문자열"}, ... 정확히 3개]}

규칙:
- 선택 코치: ${emoji} **${label}**. opening은 이 관점·톤으로 (「○○ 코치」 같은 메타 설명 문구는 쓰지 않는다).
- ${ctx.emergency_nutrition_mode ? "**저섭취·진행률 보호 모드** — 위 [긴급·저섭취 보호] 절대 준수. 트리거에 맞는 강도만 쓴다." : "톤: **데이터 관제**(팩트·명사형 종결·반말·시니컬 허용, 케어/격려 금지)."}
- opening 한 줄~최대 2문장.
- opening·quick_chips는 **아래 컨텍스트** 숫자·메뉴명만 근거.
- quick_chips **정확히 3개**. 상담·해요체 라벨 금지. **진단명·감사(Audit)** 톤 label. 각 prompt에 **kcal·g·ml** 등 오늘 수치 **최소 1회**. 톤은 수사·관제(명령·증명·판독).

컨텍스트:
${formatContextBlock(ctx)}`;
}

/**
 * 일반 턴 — 스트리밍 단톡 구분자 프로토콜.
 * 태그는 대문자 그대로. 태그 밖에 여분 텍스트 금지.
 */
export function buildAiCoachChatPrompt(
  ctx: CoachApiContext,
  message: string,
  history: { message: string; is_ai: boolean }[],
  coachId: CoachPersonaId,
  interventionGuests: CoachPersonaId[] = []
): string {
  const locked = pickRuleBasedCoachSlots(ctx);
  const lockLines = ruleLockedCoachPromptLines(locked, "chat");
  const guard = ctx.emergency_nutrition_mode
    ? emergencyNutritionGuardPrompt(ctx)
    : "";
  const { emoji, label } = coachMeta(coachId);
  const transcript = buildTranscript(history);
  const nightCue = nightCueIfNeeded(ctx);
  const leadCodename = interventionCodename(coachId);
  const guests = interventionGuests.filter((g) => g !== coachId);
  const interventionBlock =
    guests.length === 0
      ? ""
      : `
[기습 등판 — BAPS 단톡방 초대(서버 트리거 확정)]
지금은 **리드 1명만이 아니라** 아래 코치들이 **동시에 방에 난입한 상태**다. 유저에게 알림톡에 사람 초대된 듯한 재미를 준다.
**난입 게스트(이 순서·인원 고정):**
${formatInterventionTriggerSummary(guests)}

난입 연출 규칙 — 스트리밍 태그만 사용:
1) [ANALYSIS] [MISSION] 은 **리드 · ${leadCodename}** 관점으로 먼저 처리 (짧은 팩트·데이터 코칭).
2) 각 **난입 게스트**마다 반드시 **연속 2블록**:
   - 첫 줄: [INVITE] 태그명만 (대문자 한 단어). 예: [INVITE] MENTAL
     → 본문에 추가 문장·이모지·따옴표 금지. 허용 태그명: MENTAL | ROI | NUTRITION | EXERCISE (난입 목록에 있는 것만)
   - 둘째 블록: [MENTAL] 또는 [ROI] 등 **같은 코치의 팩폭 한 문장**.
3) 리드 1:1 태그 **${requiredCoachTag(coachId)}** 도 **반드시 1회** 포함한다.
   - 리드 태그가 난입 게스트와 **동일 인물**이면: 해당 코치에 대해 [INVITE] 없이 리드 태그 한 블록만 써도 된다.
4) 난입이 **없으면** [INVITE] 블록을 **절대** 출력하지 않는다.
`;

  return `${COACH_PERSONA}
${guard}
${coachVoicePromptAppend(coachId)}
${COACH_TIME_BAND_HINT}
${nightCue}
${lockLines}
${interventionBlock}

[오케스트레이터 — BAPS 단톡 — 스트리밍 출력 규약]
너는 5명의 코치가 있는 **BAPS 감시본부**다. 응답은 **오직 아래 태그 블록만** 순서대로 이어 붙인다.
**절대 금지**: 응답을 JSON 객체 전체로 시작(첫 글자가 '{' 인 형태), 코드펜스, 자연어 머리말, 이모지 말머리(예: [🚨분석]·「분석:」).
[DATA_CARD]·[QUICK_CHIPS] **안의** 한 줄 JSON만 예외.
블록 사이에 태그 없는 자유 텍스트 금지. 코치 본문에는 이모지·코치 이름 접두어 금지(앱이 아바타·이름을 붙임).

**[단톡 톤 — 반말·시니컬]**
- 말투는 **가벼운 반말**을 허용한다. 다만 존댓말 케어("~해요", "~하세요")·격려·응원 문장은 피하고, **보고서체·명사형 종결**과 섞어도 된다.
- **시니컬(Cynical)**: 비속어·욕설·혐오 없이 **날카로운 조롱·냉소**는 적극 허용. 유저를 달래지 말고 데이터로 찌른다.
- 한 블록 = 짧고 날것. 카톡 단톡방처럼 툭 던지는 한 방(예: 의지력·데이터 오염·회로 오류 프레임).

**코치 태그 문장**: 각 [DIET] 등 블록은 **원칙 1문장**, 최대 2문장. 욕설·혐오·의학 단정(치료 보장) 금지.
상황에 맞게 **서로 다른 코치 3명**(리드 포함)을 반드시 등장: [DIET] [NUTRITION] [EXERCISE] [MENTAL] [ROI] 중 **서로 다른 3개** 태그를 채운다(리드 **${requiredCoachTag(coachId)}** 는 필수 포함).

필수 순서(내용 없으면 빈 줄이라도 태그는 유지):
[ANALYSIS] 현상 **1문장**(최대 2문장). 숫자·메뉴는 ** 로 감싼다.
[MISSION] 명령조 실행 **1문장**(최대 2문장).
${guests.length > 0 ? `그 다음 **각 난입 게스트**마다 [INVITE] TAG → [TAG] 한 문장 (위 [기습 등판] 순서 엄수).\n` : ""}그 다음 위 **코치 3명** 태그 블록(서로 다른 3개): 각 태그 아래 **한 문장** 원칙.
  [DIET] | [NUTRITION] | [EXERCISE] | [MENTAL] | [ROI]
- **필수**: 유저가 고른 1:1 리드 **${emoji} ${label}** → 태그 **${requiredCoachTag(coachId)}** 포함.
- ${ctx.emergency_nutrition_mode ? "[저섭취·진행률 보호] 위 서버 가드 블록 준수 — 독설·운동 강요 금지. 트리거(intake_pace_mild 등)에 맞는 강도만. 오전+3일추이만일 땐 공포·기아 톤 금지." : "독설 허용. 심야(22~05)에는 [MENTAL]에서 수면·리듬·호르몬 프레임, 즉시 고강도 운동 강요 금지."}
- 규칙 선발 코치(서버)는 반드시 태그로 반영: ${locked.join(", ") || "(없음)"}.
[DATA_CARD] 유저가 특정 음식 **허용/먹어도 되나** 질문일 때만 JSON 한 줄(훑어 보기용 스키마는 컨텍스트 설명에만); 아니면 빈 객체 한 줄.
[QUICK_CHIPS] JSON 배열 한 줄, 정확히 3개(각 항목 label·prompt 문자열).

컨텍스트:
${formatContextBlock(ctx)}

지금까지 대화:
${transcript || "(없음)"}

유저: ${message}`;
}
