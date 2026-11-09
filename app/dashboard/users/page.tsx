import { requireAdmin } from "@/lib/auth-helpers";
import UsersContent from "./users-content";

export default async function UsersPage() {
  const session = await requireAdmin();
  return <UsersContent currentRole={session.user.role} currentUserId={session.user.id} />;
}
