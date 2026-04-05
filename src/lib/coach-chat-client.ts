import {
  delimitedStreamToCoachChatReply,
  parseCoachDelimitedStream,
} from "@/lib/coach-delimited-stream";
import { parseCoachJson } from "@/lib/coach-json-parse";

export type CoachApiResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; data: unknown };

export type PostCoachChatOptions = {
  onStreamRaw?: (accumulated: string) => void;
  /** 일반 턴(비부트스트랩) 스트림용 단톡 태그 파싱 미리보기 */
  onDelimitedPreview?: (
    preview: ReturnType<typeof parseCoachDelimitedStream>
  ) => void;
};

/** POST /api/chat — text/stream 판별 후 JSON 또는 구분자 프로토콜 파싱 */
export async function postCoachChat(
  body: Record<string, unknown>,
  opts?: PostCoachChatOptions
): Promise<CoachApiResult> {
  const isBootstrap = body.bootstrap === true;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const ct = res.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return {
      ok: false,
      status: res.status,
      data: { error: "응답 본문이 없습니다." },
    };
  }

  const decoder = new TextDecoder();
  let full = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      opts?.onStreamRaw?.(full);
      if (!isBootstrap) {
        opts?.onDelimitedPreview?.(parseCoachDelimitedStream(full, false));
      }
    }
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: "스트림 읽기 실패" },
    };
  }

  if (!res.ok) {
    try {
      if (isBootstrap) {
        return {
          ok: false,
          status: res.status,
          data: parseCoachJson<unknown>(full),
        };
      }
      return {
        ok: false,
        status: res.status,
        data: delimitedStreamToCoachChatReply(full),
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: { error: full.slice(0, 240) },
      };
    }
  }

  try {
    if (isBootstrap) {
      return {
        ok: true,
        status: res.status,
        data: parseCoachJson<unknown>(full),
      };
    }
    return {
      ok: true,
      status: res.status,
      data: delimitedStreamToCoachChatReply(full),
    };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: "응답 파싱 실패" },
    };
  }
}
