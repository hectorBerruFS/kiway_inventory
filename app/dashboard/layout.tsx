import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
