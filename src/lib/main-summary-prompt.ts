import type { CoachApiContext } from "@/lib/chat-coach";
import type { CalorieZone } from "@/lib/calorie-zone";
import { isFatHeavy, isProteinLow, macroKcalBreakdown } from "@/lib/meal-macros";

export function buildMainDashboardInsightPrompt(
  ctx: CoachApiContext,
  opts: {
    dateYmd: string;
    /** 클라이언트 기준 표시 시각 (예: 오전 4:53) */
    localTimeLabel: string;
    zone: CalorieZone;
  }
): string {
  const { user_profile, macros_g, recent_meals, meal_lines, water_intake_ml } =
    ctx;
  const cur = user_profile.current_cal;
  const tgt = user_profile.target_cal;
  const rem = Math.round(tgt - cur);
  const last =
    meal_lines.length > 0
      ? meal_lines[meal_lines.length - 1]!.food_name
      : "(기록 없음)";
  const mealsJoined =
    recent_meals.length > 0 ? recent_meals.join(", ") : "(없음)";
  const night = ctx.local_hour >= 22 || ctx.local_hour < 5;
  const fatHeavy = isFatHeavy({
    carbsG: macros_g.carbs,
    proteinG: macros_g.protein,
    fatG: macros_g.fat,
  });
  const proteinLow = isProteinLow(
    {
      carbsG: macros_g.carbs,
      proteinG: macros_g.protein,
      fatG: macros_g.fat,
    },
    cur
  );
  const { sum: macroKcalSum } = macroKcalBreakdown({
    carbsG: macros_g.carbs,
    proteinG: macros_g.protein,
    fatG: macros_g.fat,
  });

  const flags = [
    night ? "심야 시간대" : null,
    fatHeavy ? "지방 비중 높음" : null,
    proteinLow ? "단백질 부족 패턴" : null,
    opts.zone === "danger" ? "목표 칼로리 초과" : null,
    opts.zone === "caution" ? "목표 근접(잔여 적음)" : null,
    opts.zone === "empty" ? "섭취 거의 없음" : null,
    ctx.emergency_nutrition_mode ? "저섭취 긴급 플래그(팩폭·조롱·굶음조장 금지)" : null,
  ]
    .filter(Boolean)
    .join(" / ") || "특이 플래그 없음";

  return `너는 BAPS **팩폭 감시 코치**다. 메인 대시보드 최상단에 붙는 **한 줄 통찰**만 출력한다.

[출력 규칙]
- 한국어 **한 문장**을 우선(임팩트 필요하면 **두 문장**, 전체 **120자 이내**).
- 냉정·날카롭게. "좋아요" "여유 있어요" 같은 무난한 응원 문구는 금지.
- **시간·칼로리·탄단지·목표 잔여**를 조합해, 아래 [상황 예시]와 비슷한 **팩트 기반** 톤으로.
- 컨텍스트에 **있는 음식명·숫자만** 인용. 없는 메뉴 지어내기 금지.
- 출력은 **본문 텍스트만**. 따옴표로 감싸지 말 것. 접두어(한마디:/인사이트:) 금지.
${
  ctx.emergency_nutrition_mode
    ? `- **긴급 저섭취 모드**: 조롱·굶음 선동 금지. 짧은 보고체로 사실·권고만.\n`
    : ""
}

[상황 예시 톤 — 말투만 참고, 문장 복붙 금지]
- 심야 + 고지방 디저트 류: 시간을 넣어 찌르기.
- 단백 부족: 칼로리는 맞췄는데 단백이 비었을 때 근손실 프레임.
- 목표 직전 소량 잔여: 의지력 vs 본능 프레임.

[컨텍스트]
- 선택일: ${opts.dateYmd} · 앱 기준 시각 **${opts.localTimeLabel}**
- 오늘 **${cur}kcal** / 목표 **${tgt}kcal** · 잔여 **${rem}kcal** (음수면 초과)
- 칼로리 구역: ${opts.zone}
- 탄수 **${macros_g.carbs}g** · 단백 **${macros_g.protein}g** · 지방 **${macros_g.fat}g** (매크로 합산 약 **${Math.round(macroKcalSum)}kcal**)
- 기록 끼니 수: **${meal_lines.length}** · 마지막 기록 메뉴: **${last}**
- 오늘 메뉴 목록: ${mealsJoined}
- 수분: **${water_intake_ml}ml**
- 자동 플래그: ${flags}

지금 상황에 맞는 **한 줄**을 출력하라.`;
}
