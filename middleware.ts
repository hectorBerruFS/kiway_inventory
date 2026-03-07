import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/setup",
  "/api/auth",
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // 1️⃣ Permitir rutas públicas
  if (isPublicRoute(pathname)) {

    // Si el usuario ya está logueado y entra a login
    if (isAuthenticated && pathname.startsWith("/login")) {
      return withNoStore(
        NextResponse.redirect(new URL("/dashboard", req.url))
      );
    }

    return NextResponse.next();
  }

  // 2️⃣ Usuario NO autenticado → redirect a login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);

    loginUrl.searchParams.set(
      "callbackUrl",
      req.nextUrl.pathname + req.nextUrl.search
    );

    return withNoStore(
      NextResponse.redirect(loginUrl)
    );
  }

  // 3️⃣ Usuario autenticado → continuar
  return withNoStore(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|images|placeholder).*)",
  ],
};