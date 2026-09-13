import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

// Kept in sync with AUTH_COOKIE in @/lib/auth (not imported here: that module
// pulls in next/headers, which isn't available in this runtime).
const AUTH_COOKIE = "danke_auth";

/**
 * Gate every page/route behind a valid session cookie. `/login` is always
 * reachable; an already-authed user visiting it is bounced home.
 *
 * Named `proxy` rather than `middleware`: Next 16 deprecated the middleware
 * file convention and warned about it on every dev start.
 */
export default async function proxy(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionToken(token, process.env.AUTH_SESSION_TOKEN);
  const isLogin = req.nextUrl.pathname === "/login";

  if (!authed) {
    if (isLogin) return NextResponse.next();
    /* An API call wants an answer it can read, not a login page. Fetch follows
       the redirect and hands the caller 200 OK full of HTML, which is why a
       session expiring mid-review surfaced as "could not reach the app". */
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLogin) {
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
