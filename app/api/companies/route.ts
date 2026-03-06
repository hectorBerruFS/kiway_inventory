import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCompaniesWithBudgets, createCompany } from "@/services/company.service";
import { ROLES } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const filter = session.user.role < ROLES.ADMIN ? session.user.id : undefined;
    const result = await getCompaniesWithBudgets(filter);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const company = await createCompany({
      name: body.name,
      monthlyBudget: body.monthlyBudget,
      supervisorId: body.supervisorId,
    });
    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

