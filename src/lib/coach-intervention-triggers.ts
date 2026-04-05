import type { CoachApiContext } from "@/lib/chat-coach";
import { macroCaloriePercents, type MacroTotals } from "@/lib/meal-macros";
import type { CoachPersonaId } from "@/lib/coach-personas";
import { coachMeta } from "@/lib/coach-personas";
import { pickRuleBasedCoachSlots } from "@/lib/coach-orchestrator-rules";

const MACRO_KCAL_FLOOR = 80;
/** 지방 에너지 비중 (트리거: 영양 분석가) */
const FAT_SHARE_TRIGGER = 0.4;
/** 탄수(당류 대용) 에너지 비중 */
const CARB_SHARE_TRIGGER = 0.4;
/** 폭식: 한 끼 kcal */
const BINGE_MEAL_KCAL = 1000;
/** 가성비 코치: 한 끼 식비(원) */
const PRICE_TRIGGER_WON = 20_000;

const LATE_MSG_RE =
  /야식|심야|밤에|늦게\s*먹|새벽에|몇\s*시에.*먹|11시|12시|한\s*시|두\s*시|밤\s*먹|늦은\s*밤|midnight|late\s*snack/i;

/** 단톡 시스템 배너용 콜사인 (코치 카드 label과 구분) */
export function interventionCodename(id: CoachPersonaId): string {
  switch (id) {
    case "mental":
      return "멘탈 헌터";
    case "roi":
      return "가성비 코치";
    case "nutrition":
      return "영양 분석가";
    case "exercise":
      return "운동 조교";
    case "diet":
      return `${coachMeta("diet").label} 코치`;
    default:
      return coachMeta(id).label;
  }
}

function macrosFromCtx(ctx: CoachApiContext): MacroTotals {
  const { carbs, protein, fat } = ctx.macros_g;
  return { carbsG: carbs, proteinG: protein, fatG: fat };
}

function pushUnique(out: CoachPersonaId[], id: CoachPersonaId): void {
  if (!out.includes(id)) out.push(id);
}

/**
 * 서버 룰만으로 난입 게스트 코치 결정 (리드 코치 제외 전제).
 * 순서: 멘탈 → 가성비 → 영양 → 운동 (연출 일관성).
 */
export function evaluateInterventionGuests(
  ctx: CoachApiContext,
  userMessage: string
): CoachPersonaId[] {
  const out: CoachPersonaId[] = [];
  const msg = userMessage.trim();
  const hasMealsToday = ctx.meal_lines.length > 0;

  const lateByClock =
    (ctx.local_hour >= 23 || ctx.local_hour < 5) && hasMealsToday;
  const lateByText = LATE_MSG_RE.test(msg);
  if (lateByClock || lateByText) {
    pushUnique(out, "mental");
  }

  if (ctx.priced_meal_lines.some((p) => p.price_won > PRICE_TRIGGER_WON)) {
    pushUnique(out, "roi");
  }

  const m = macrosFromCtx(ctx);
  const { carb, fat } = macroCaloriePercents(m);
  const fk = m.fatG * 9;
  const ck = m.carbsG * 4;
  const pk = m.proteinG * 4;
  const sum = fk + ck + pk;
  if (
    sum >= MACRO_KCAL_FLOOR &&
    (fat >= FAT_SHARE_TRIGGER || carb >= CARB_SHARE_TRIGGER)
  ) {
    pushUnique(out, "nutrition");
  }

  const maxMealCal =
    ctx.meal_lines.length > 0
      ? Math.max(...ctx.meal_lines.map((l) => Number(l.cal) || 0))
      : 0;
  if (maxMealCal >= BINGE_MEAL_KCAL) {
    pushUnique(out, "exercise");
  }

  return out;
}

/** 규칙 선발 슬롯과 병합, 리드 제외, 최대 4명 */
export function pickInterventionGuestsForChat(
  ctx: CoachApiContext,
  userMessage: string,
  leadCoach: CoachPersonaId
): CoachPersonaId[] {
  const triggered = evaluateInterventionGuests(ctx, userMessage);
  const locked = pickRuleBasedCoachSlots(ctx);
  const merged: CoachPersonaId[] = [];
  for (const id of triggered) {
    if (id !== leadCoach) pushUnique(merged, id);
  }
  for (const id of locked) {
    if (id !== leadCoach) pushUnique(merged, id);
  }
  return merged.slice(0, 4);
}

/** 프롬프트 주입 — 어떤 아이콘·콜사인으로 압박할지 */
export function formatInterventionTriggerSummary(
  guests: CoachPersonaId[]
): string {
  if (guests.length === 0) return "";
  return guests
    .map((id) => {
      const { emoji } = coachMeta(id);
      const tag =
        id === "diet"
          ? "DIET"
          : id === "nutrition"
            ? "NUTRITION"
            : id === "exercise"
              ? "EXERCISE"
              : id === "mental"
                ? "MENTAL"
                : "ROI";
      return `${emoji} ${interventionCodename(id)} [INVITE] → [${tag}]`;
    })
    .join("\n");
}
