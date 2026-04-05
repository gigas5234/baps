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

  return `${COACH_PERSONA}
${guard}
${coachVoicePromptAppend(coachId)}
${COACH_TIME_BAND_HINT}
${nightCueIfNeeded(ctx)}
${lockLines}

[부트스트랩 작업 — 출력 형식]
**반드시** 하나의 JSON 객체만 출력한다. 앞뒤 자연어·코드펜스·설명 금지.

JSON 스키마 형태:
{"opening":"문자열", "quick_chips":[{"label":"문자열","prompt":"문자열"}, ... 정확히 3개]}

규칙:
- 지금 화면의 **1:1 담당 코치**: ${emoji} **${label} 코치**. opening은 이 코치 톤.
- ${ctx.emergency_nutrition_mode ? "**긴급 보호 모드** — 위 [🚨] 절대 준수." : "톤: **전략적 감시 코칭**(팩트·냉정·실행 압박)."}
- opening 한 줄~최대 2문장.
- opening·quick_chips는 **아래 컨텍스트** 숫자·메뉴명만 근거.
- quick_chips **정확히 3개**. 각 prompt에 오늘 수치 최소 1회.

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

**코치 태그 문장**: 각 [DIET] 등 블록은 **원칙 1문장**, 최대 2문장. 카카오톡 단톡처럼 짧고 팩트 위주(가볍게 반말 섞어도 됨, 예: 「남준님, 니 의지력이 넘나없는것」). 욕설·혐오·의학 단정 금지.
상황에 맞게 **서로 다른 코치 3명**(리드 포함)을 반드시 등장: [DIET] [NUTRITION] [EXERCISE] [MENTAL] [ROI] 중 **서로 다른 3개** 태그를 채운다(리드 **${requiredCoachTag(coachId)}** 는 필수 포함).

필수 순서(내용 없으면 빈 줄이라도 태그는 유지):
[ANALYSIS] 현상 **1문장**(최대 2문장). 숫자·메뉴는 ** 로 감싼다.
[MISSION] 명령조 실행 **1문장**(최대 2문장).
${guests.length > 0 ? `그 다음 **각 난입 게스트**마다 [INVITE] TAG → [TAG] 한 문장 (위 [기습 등판] 순서 엄수).\n` : ""}그 다음 위 **코치 3명** 태그 블록(서로 다른 3개): 각 태그 아래 **한 문장** 원칙.
  [DIET] | [NUTRITION] | [EXERCISE] | [MENTAL] | [ROI]
- **필수**: 유저가 고른 1:1 리드 **${emoji} ${label}** → 태그 **${requiredCoachTag(coachId)}** 포함.
- ${ctx.emergency_nutrition_mode ? "[긴급 보호 모드] 위 [🚨] — 독설·운동 강요 금지. 멘탈·분석관 톤." : "독설 허용. 심야(22~05)에는 [MENTAL]에서 수면·리듬·호르몬 프레임, 즉시 고강도 운동 강요 금지."}
- 규칙 선발 코치(서버)는 반드시 태그로 반영: ${locked.join(", ") || "(없음)"}.
[DATA_CARD] 유저가 특정 음식 **허용/먹어도 되나** 질문일 때만 JSON 한 줄(훑어 보기용 스키마는 컨텍스트 설명에만); 아니면 빈 객체 한 줄.
[QUICK_CHIPS] JSON 배열 한 줄, 정확히 3개(각 항목 label·prompt 문자열).

컨텍스트:
${formatContextBlock(ctx)}

지금까지 대화:
${transcript || "(없음)"}

유저: ${message}`;
}
