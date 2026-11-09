import { requireAdmin } from "@/lib/auth-helpers";
import StockSettingsContent from "./stock-content";

export default async function StockSettingsPage() {
  await requireAdmin();
  return <StockSettingsContent />;
}
