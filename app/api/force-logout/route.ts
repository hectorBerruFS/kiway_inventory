import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const redirectTo = new URL("/login?loggedOut=1", req.url);
  const res = NextResponse.redirect(redirectTo);

  // Keep this minimal: only delete the real cookies seen in production logs.
  // Too many Set-Cookie variants can be ignored/truncated by some edge layers.
  res.cookies.delete("__Secure-authjs.session-token");
  res.cookies.delete("__Host-authjs.csrf-token");
  res.cookies.delete("__Secure-authjs.callback-url");

  // Defensive fallback for old non-secure names.
  res.cookies.delete("authjs.session-token");
  res.cookies.delete("authjs.csrf-token");
  res.cookies.delete("authjs.callback-url");

  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][force_logout_route]", {
      deleted: [
        "__Secure-authjs.session-token",
        "__Host-authjs.csrf-token",
        "__Secure-authjs.callback-url",
        "authjs.session-token",
        "authjs.csrf-token",
        "authjs.callback-url",
      ],
    });
  }

  return res;
}
