import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Kept in sync with AUTH_COOKIE in @/lib/auth (not imported here: that module
// pulls in next/headers, which isn't available in the edge middleware runtime).
const AUTH_COOKIE = "danke_auth";

/**
 * Gate every page/route behind the session cookie. `/login` is always
 * reachable; an already-authed user visiting it is bounced home.
 */
export function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = Boolean(token) && token === process.env.AUTH_SESSION_TOKEN;
  const isLogin = req.nextUrl.pathname === "/login";

  if (!authed && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (authed && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
