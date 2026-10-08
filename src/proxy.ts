import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send signed-out visitors to the right sign-in page
// before rendering. The real authorisation (role + permission) happens on the
// server in every admin page and action via requireAdmin()/requireUser().
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("rl_session")?.value);
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (pathname.startsWith("/account")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
