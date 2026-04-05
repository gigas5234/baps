/**
 * 음식명 → 이모지 (네트워크 없이 번들에 포함).
 * 퀵 로그·타임라인 등 사진 미등록 시 썸네일 대용.
 * 긴 목록은 위에서부터 첫 매칭 우선(구체적인 규칙을 앞에 둠).
 */

const RULES: { re: RegExp; emoji: string }[] = [
  { re: /짜장|짜짱|자장|jajang|jjajang|black\s*bean/i, emoji: "🍜" },
  { re: /짬뽕|jjamppong|champong/i, emoji: "🍜" },
  { re: /탕수육|tangsuyuk|sweet\s*sour/i, emoji: "🍖" },
  { re: /김밥|kimbap|gimbap/i, emoji: "🍙" },
  { re: /초밥|스시|사시미|sushi|sashimi|연어초밥|참치초밥/i, emoji: "🍣" },
  { re: /물회|회무침/i, emoji: "🐟" },
  { re: /라면|라멘|ramen|ramyun|cup\s*noodle|너구리|신라면|진라면/i, emoji: "🍜" },
  { re: /냉면|물냉|비냉|막국수|naengmyeon|냉소바/i, emoji: "🍜" },
  { re: /우동|udon/i, emoji: "🍜" },
  { re: /파스타|pasta|스파게티|spaghetti|크림파스타|로제/i, emoji: "🍝" },
  { re: /피자|pizza|피자헛|도미노/i, emoji: "🍕" },
  { re: /햄버거|버거|burger|맥날|맥도날드|버거킹|와퍼/i, emoji: "🍔" },
  { re: /샌드위치|샌드|sandwich|서브웨이|blt/i, emoji: "🥪" },
  { re: /치킨|닭강정|통닭|후라이드|양념치킨|순살|fried\s*chicken|윙|wings/i, emoji: "🍗" },
  { re: /족발|보쌈|jokbal/i, emoji: "🍖" },
  { re: /삼겹|불고기|갈비|galbi|바베큐|bbq|스테이크|steak|돼지갈비/i, emoji: "🥩" },
  { re: /떡볶이|떡국|tteok|떡\s/i, emoji: "🥘" },
  { re: /순대|튀김|분식|오뎅|어묵|odeng|핫바/i, emoji: "🍢" },
  { re: /만두|군만두|만둣|gyoza|dumpling|교자/i, emoji: "🥟" },
  { re: /찌개|jjigae|국밥|설렁탕|갈비탕|삼계탕|국\s|탕\s|stew|\bsoup\b/i, emoji: "🍲" },
  { re: /죽|porridge|미음|누룽지/i, emoji: "🥣" },
  { re: /도시락|lunchbox|벤또|bento/i, emoji: "🍱" },
  {
    re: /볶음밥|비빔밥|덮밥|돈부리|donburi|don\s*buri|솥밥|잡곡밥|알밥|쌀밥|주먹밥|공깃밥|오므라이스|오므리스|bokkeum|fried\s*rice|rice\s*bowl|gohan|bibimbap|curry\s*rice/i,
    emoji: "🍚",
  },
  { re: /샐러드|salad/i, emoji: "🥗" },
  { re: /김치|kimchi|나박/i, emoji: "🥬" },
  { re: /계란|달걀|egg\s|오믈렛/i, emoji: "🥚" },
  { re: /두부|tofu|순두부/i, emoji: "🧈" },
  { re: /빵|도넛|donut|크루아상|베이글|토스트|케이크|케익|cake|마카롱|머핀|muffin|와플|waffle/i, emoji: "🥐" },
  { re: /쿠키|cookie|과자|스낵|snack|비스킷/i, emoji: "🍪" },
  { re: /초콜|초코|chocolate|초코렛/i, emoji: "🍫" },
  { re: /아이스크림|아이스|빙수|bingsu|ice\s*cream|소프트/i, emoji: "🍨" },
  { re: /커피|아메리카노|아아|espresso|라떼|latte|카페|mocha|모카|바닐라라떼/i, emoji: "☕" },
  { re: /녹차|홍차|밀크티|버블티|bubble\s*tea|차\s|tea\b/i, emoji: "🍵" },
  { re: /맥주|beer|호프|캔맥주/i, emoji: "🍺" },
  { re: /소주|막걸리|맥에|와인|wine|위스키|whisky|칵테일|술|highball/i, emoji: "🍷" },
  { re: /우유|요거트|요구르트|yogurt|요플레|cheese|치즈/i, emoji: "🥛" },
  { re: /주스|juice|스무디|smoothie|에이드|ade\b/i, emoji: "🧃" },
  { re: /콜라|사이다|탄산|soda|펩시|코카|제로/i, emoji: "🥤" },
  { re: /생수|정수기|물\s*\d|\bwater\b(?!\s*melon)|먹는\s*물/i, emoji: "💧" },
  { re: /새우|게|랍스터|랍스타|해물|오징어|문어|굴|전복|seafood|shrimp|lobster/i, emoji: "🦐" },
  { re: /생선|고등어|연어|참치|mackerel|salmon|fish(?!\s*and)/i, emoji: "🐟" },
  { re: /사과|바나나|오렌지|딸기|포도|수박|멜론|키위|복숭아|과일|fruit|grape/i, emoji: "🍎" },
  { re: /떡|한과|약과|송편|인절미/i, emoji: "🍡" },
];

const DEFAULT_EMOJI = "🍽️";

/**
 * 음식 표시명에서 이모지 하나 선택 (매칭 없으면 🍽️).
 */
export function foodEmojiForName(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return DEFAULT_EMOJI;
  const hay = `${t}\n${t.toLowerCase()}`;
  for (const { re, emoji } of RULES) {
    try {
      if (re.test(hay)) return emoji;
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_EMOJI;
}
