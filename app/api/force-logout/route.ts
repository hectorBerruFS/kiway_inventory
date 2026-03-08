import { NextResponse } from "next/server";

const AUTH_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Host-authjs.csrf-token",
  "authjs.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
];

function deleteCookieVariants(res: NextResponse, name: string, hostname: string) {
  const base = {
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure: true,
  };

  const paths = ["/", "/api/auth"];

  for (const path of paths) {
    res.cookies.set(name, "", { ...base, path, httpOnly: true });
    res.cookies.set(name, "", { ...base, path, httpOnly: false });
    res.cookies.set(name, "", { ...base, path, httpOnly: true, domain: hostname });
    res.cookies.set(name, "", { ...base, path, httpOnly: false, domain: hostname });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hostname = url.hostname;
  const redirectTo = new URL("/login?loggedOut=1", req.url);
  const res = NextResponse.redirect(redirectTo);

  for (const cookieName of AUTH_COOKIE_NAMES) {
    deleteCookieVariants(res, cookieName, hostname);
  }

  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][force_logout_route]", { hostname, cookiesCleared: AUTH_COOKIE_NAMES.length });
  }

  return res;
}
