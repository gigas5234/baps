import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";

export const runtime = "nodejs";

const CLIENT_UPSTREAM_ERROR =
  "통신 장애가 발생했습니다. 잠시 후 다시 시도하세요.";

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
  const { user } = await getAuthenticatedSupabaseUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

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
      console.error(
        "Azure speech token upstream error:",
        tokenRes.status,
        detail.slice(0, 1200)
      );
      return NextResponse.json({ error: CLIENT_UPSTREAM_ERROR }, { status: 502 });
    }

    const token = (await tokenRes.text()).trim();
    if (!token) {
      console.error("Azure speech token: empty body");
      return NextResponse.json({ error: CLIENT_UPSTREAM_ERROR }, { status: 502 });
    }

    return NextResponse.json({ token, region });
  } catch (e) {
    console.error("Azure speech token fetch error:", e);
    return NextResponse.json({ error: CLIENT_UPSTREAM_ERROR }, { status: 500 });
  }
}
