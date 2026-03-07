"use server";

import { signOut } from "@/lib/auth";
import { cookies } from "next/headers";

export async function logout() {
  // Borrar manualmente la cookie antes de signOut
  const cookieStore = await cookies();
  
  // Borrar ambas variantes (con y sin __Secure- por si acaso)
  cookieStore.delete("__Secure-authjs.session-token");
  cookieStore.delete("authjs.session-token");
  cookieStore.delete("next-auth.session-token");
  
  await signOut({ redirectTo: "/login" });
}