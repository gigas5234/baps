import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;
  /**
   * public 정적 미디어 — 비로그인 시 /login 리다이렉트에 걸리면
   * 브라우저가 MP4 대신 HTML을 받아 로그인 페이지에서만 영상이 안 나오는 현상이 난다.
   */
  if (
    pathname === "/main.mp4" ||
    /\.(mp4|webm|m4v|mov)$/i.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  // Supabase 미설정 시 그냥 통과 (개발 초기 단계)
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname === "/login";
  const isCallbackPage = request.nextUrl.pathname === "/auth/callback";

  // Allow callback through
  if (isCallbackPage) return supabaseResponse;

  // Not logged in → redirect to login
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in but on login page → redirect to home
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|main\\.mp4).*)",
  ],
};
