import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthlyConsumedBudget, getAvailableBudget, getCommittedBudgetExceeded } from "@/services/budget.service";
import { companies } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const url = new URL(req.url);
  const month = url.searchParams.get("month") || undefined; // YYYY-MM

  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

    const consumed = await getMonthlyConsumedBudget(id, month);
    const available = await getAvailableBudget(company.monthlyBudget, id, month);
    const { isExceeded, committed } = await getCommittedBudgetExceeded(company.monthlyBudget, id, month);
    const isLimitReached = await import("@/services/budget.service").then(m => m.checkMonthlyOrderLimit(id, month || ""));
    const hasAuthorization = isLimitReached
      ? await import("@/services/authorization.service").then(m => m.validateAuthorization(id, month || ""))
      : null;

    return NextResponse.json({
      consumed,
      available,
      committed,
      isCommittedExceeded: isExceeded,
      isLimitReached: isLimitReached && !hasAuthorization,
      hasExtraAuthorization: !!hasAuthorization
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
