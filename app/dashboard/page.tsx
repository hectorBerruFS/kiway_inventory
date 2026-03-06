import { requireAuth } from "@/lib/auth-helpers";
import { ROLES } from "@/lib/db/schema";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function DashboardPage() {
  const session = await requireAuth();
  const role = session.user.role;

  if (role >= ROLES.ADMIN) {
    return <AdminDashboard />;
  }

  return <SupervisorDashboard userId={session.user.id} />;
}
