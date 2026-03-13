import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listOrders, createOrder } from "@/services/order.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "draft" | "sent" | "approved" | "rejected" | "cancelled" | null;
  const companyId = searchParams.get("companyId");
  const month = searchParams.get("month");

  try {
    const result = await listOrders(session.user.id, session.user.role, {
      status: status || undefined,
      companyId: companyId || undefined,
      month: month || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  try {
    const order = await createOrder(session.user.id, session.user.role, {
      companyId: body.companyId,
      items: body.items,
      intendedMonth: body.intendedMonth,
    });

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
