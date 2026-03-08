"use server";

import { signOut } from "@/lib/auth";

export async function logout() {
  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][logout_action] start");
  }

  await signOut({ redirectTo: "/login" });

  if (process.env.AUTH_DEBUG === "true") {
    console.log("[auth][logout_action] completed");
  }
}
