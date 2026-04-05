/** 카카오톡 스타일 시각 (예: 오후 5:58) */
export function formatKoreanChatTime(d: Date): string {
  return d.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
