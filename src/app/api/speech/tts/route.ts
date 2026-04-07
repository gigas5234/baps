import { NextResponse } from "next/server";
import {
  coachNeuralTts,
  parseCoachPersonaId,
  type CoachPersonaId,
} from "@/lib/coach-personas";

export const runtime = "nodejs";

const MAX_CHARS = 4000;

function escapeForSsml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ttsEndpoint(): string | null {
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (endpoint) {
    const base = endpoint.replace(/\/$/, "");
    return `${base}/cognitiveservices/v1`;
  }
  if (region) {
    return `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }
  return null;
}

/**
 * Azure Neural TTS — 코치별 음성·속도는 `COACH_NEURAL_TTS`.
 * Body: `{ text: string, coachId?: CoachPersonaId }`
 */
export async function POST(req: Request) {
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
  const safeText = escapeForSsml(text.slice(0, MAX_CHARS));

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR"><voice name="${voiceName}"><prosody rate="${escapeForSsml(prosodyRate)}">${safeText}</prosody></voice></speak>`;

  try {
    const ttsRes = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      },
      body: ssml,
    });

    if (!ttsRes.ok) {
      const detail = await ttsRes.text();
      return NextResponse.json(
        {
          error: "Azure TTS 요청에 실패했습니다.",
          status: ttsRes.status,
          detail: detail.slice(0, 600),
        },
        { status: 502 }
      );
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
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: "TTS 처리 중 오류", detail: msg },
      { status: 500 }
    );
  }
}
