import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/db/schema";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(minRole: number) {
  const session = await requireAuth();
  if (session.user.role < minRole) {
    redirect("/dashboard");
  }
  return session;
}

export async function requireAdmin() {
  return requireRole(ROLES.ADMIN);
}

export async function requireSupervisor() {
  return requireRole(ROLES.SUPERVISOR);
}
