import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import { buildCoachNeuralSsml } from "@/lib/azure-speech-ssml";
import {
  coachNeuralTts,
  parseCoachPersonaId,
  type CoachPersonaId,
} from "@/lib/coach-personas";

export const runtime = "nodejs";

const CLIENT_UPSTREAM_ERROR =
  "통신 장애가 발생했습니다. 잠시 후 다시 시도하세요.";

function ttsEndpoint(): string | null {
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  /**
   * 토큰 발급용 `AZURE_SPEECH_ENDPOINT`(…/sts/v1.0/issueToken)과 달리,
   * TTS REST는 `<region>.tts.speech.microsoft.com` 전용 호스트가 정석이다.
   * 커스텀 도메인만 넣은 채 `/cognitiveservices/v1`를 붙이면 404·실패하는 경우가 많다.
   */
  if (region) {
    return `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  if (endpoint) {
    const base = endpoint.replace(/\/$/, "");
    return `${base}/cognitiveservices/v1`;
  }
  return null;
}

/**
 * Azure Neural TTS — 코치별 음성·속도는 `COACH_NEURAL_TTS`.
 * Body: `{ text: string, coachId?: CoachPersonaId }`
 */
export async function POST(req: Request) {
  const { user } = await getAuthenticatedSupabaseUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const key = process.env.AZURE_SPEECH_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "AZURE_SPEECH_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const url = ttsEndpoint();
  if (!url) {
    return NextResponse.json(
      {
        error:
          "TTS URL을 만들 수 없습니다. AZURE_SPEECH_ENDPOINT 또는 AZURE_SPEECH_REGION을 확인하세요.",
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const text =
    typeof body === "object" &&
    body !== null &&
    "text" in body &&
    typeof (body as { text: unknown }).text === "string"
      ? (body as { text: string }).text.trim()
      : "";

  if (!text) {
    return NextResponse.json({ error: "text가 비어 있습니다." }, { status: 400 });
  }

  const rawCoach =
    typeof body === "object" &&
    body !== null &&
    "coachId" in body &&
    typeof (body as { coachId: unknown }).coachId === "string"
      ? (body as { coachId: string }).coachId
      : undefined;
  const coachId: CoachPersonaId = parseCoachPersonaId(rawCoach);

  const { voiceName, prosodyRate } = coachNeuralTts(coachId);
  const ssml = buildCoachNeuralSsml(text, voiceName, prosodyRate);

  try {
    const ttsRes = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
      },
      body: ssml,
    });

    if (!ttsRes.ok) {
      const detail = await ttsRes.text();
      console.error(
        "Azure TTS upstream error:",
        ttsRes.status,
        detail.slice(0, 1200)
      );
      return NextResponse.json({ error: CLIENT_UPSTREAM_ERROR }, { status: 502 });
    }

    const buf = Buffer.from(await ttsRes.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Azure TTS fetch error:", e);
    return NextResponse.json({ error: CLIENT_UPSTREAM_ERROR }, { status: 500 });
  }
}
