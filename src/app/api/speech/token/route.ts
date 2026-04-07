import { NextResponse } from "next/server";

export const runtime = "nodejs";

function issueTokenUrl(): string | null {
  const endpoint = process.env.AZURE_SPEECH_ENDPOINT?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  if (endpoint) {
    const base = endpoint.replace(/\/$/, "");
    return `${base}/sts/v1.0/issueToken`;
  }
  if (region) {
    return `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
  }
  return null;
}

/**
 * 브라우저 Speech SDK용 단기 토큰 발급 (구독 키는 서버에만 유지)
 * 필수 env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
 * 선택: AZURE_SPEECH_ENDPOINT (커스텀 Cognitive 리소스 URL · fromEndpoint 대응)
 */
export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();

  if (!key) {
    return NextResponse.json(
      { error: "AZURE_SPEECH_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!region) {
    return NextResponse.json(
      {
        error:
          "AZURE_SPEECH_REGION이 필요합니다. (브라우저 SDK는 리전 문자열이 필요합니다)",
      },
      { status: 500 }
    );
  }

  const tokenUrl = issueTokenUrl();
  if (!tokenUrl) {
    return NextResponse.json(
      {
        error:
          "AZURE_SPEECH_ENDPOINT 또는 AZURE_SPEECH_REGION으로 토큰 URL을 만들 수 없습니다.",
      },
      { status: 500 }
    );
  }

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return NextResponse.json(
        {
          error: "Azure에서 토큰 발급에 실패했습니다.",
          status: tokenRes.status,
          detail: detail.slice(0, 800),
        },
        { status: 502 }
      );
    }

    const token = (await tokenRes.text()).trim();
    if (!token) {
      return NextResponse.json({ error: "빈 토큰 응답입니다." }, { status: 502 });
    }

    return NextResponse.json({ token, region });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: "토큰 요청 중 오류가 났습니다.", detail: msg },
      { status: 500 }
    );
  }
}
