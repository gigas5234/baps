/** 탄단지 경고 시 UI에만 쓰는 대체 메뉴 힌트 (정적, 네트워크 없음) */

export type MacroAltChip = { emoji: string; label: string };

/** 지방 비중 높을 때 — 저지방·단백·구이/찜 위주 */
export const FAT_SWAP_CHIPS: MacroAltChip[] = [
  { emoji: "🥗", label: "연어 샐러드" },
  { emoji: "🍗", label: "구운 닭가슴살" },
  { emoji: "🥙", label: "닭가슴 포케" },
  { emoji: "🍲", label: "순두부 찌개" },
];

/** 단백질 부족 시 */
export const PROTEIN_BOOST_CHIPS: MacroAltChip[] = [
  { emoji: "🍗", label: "삶은 닭가슴살" },
  { emoji: "🫘", label: "두부 반 모" },
  { emoji: "🍳", label: "계란 2개" },
  { emoji: "🥛", label: "그릭 요거트" },
];
