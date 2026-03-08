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

export async function GET(request: Request) {
  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][force_logout] start");
  }

  const url = new URL("/login?loggedOut=1", request.url);
  const res = NextResponse.redirect(url);

  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  }

  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][force_logout] cookies_cleared", { count: AUTH_COOKIE_NAMES.length });
  }

  return res;
}
