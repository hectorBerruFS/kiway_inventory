import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

const PUBLIC_ROUTES = [
  "/login",
  "/setup",
  "/api/auth",
  "/api/auth/signout",
  "/api/setup",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function withNoStore(res: NextResponse) {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("Surrogate-Control", "no-store");
  return res;
}

function clearAuthCookies(res: NextResponse) {
  const names = [
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

  for (const name of names) {
    res.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });

    res.cookies.set(name, "", {
      path: "/api/auth",
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const authCookies = req.cookies
    .getAll()
    .map((c) => c.name)
    .filter((name) => name.includes("authjs") || name.includes("next-auth"));

  if (AUTH_DEBUG) {
    console.log("[middleware]", {
      pathname,
      isAuthenticated,
      authCookies,
    });
  }

  // Force logout at edge to guarantee cookie invalidation before redirect.
  if (pathname === "/api/auth/force-logout") {
    const loginUrl = new URL("/login?loggedOut=1", req.url);
    const res = NextResponse.redirect(loginUrl);
    clearAuthCookies(res);

    if (AUTH_DEBUG) {
      console.log("[middleware][force_logout]", { cleared: true });
    }

    return withNoStore(res);
  }

  // Public routes
  if (isPublicRoute(pathname)) {
    // If already logged in, keep login page blocked except explicit logout callback.
    if (
      isAuthenticated &&
      pathname.startsWith("/login") &&
      req.nextUrl.searchParams.get("loggedOut") !== "1"
    ) {
      return withNoStore(NextResponse.redirect(new URL("/dashboard", req.url)));
    }

    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );

    return withNoStore(NextResponse.redirect(loginUrl));
  }

  // Authenticated user continues
  return withNoStore(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|images|placeholder).*)",
  ],
};
