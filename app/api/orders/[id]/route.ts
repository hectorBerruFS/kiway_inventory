import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderWithItems, updateOrderItems } from "@/services/order.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const order = await getOrderWithItems(id, session.user.id, session.user.role);
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const updated = await updateOrderItems(
      id,
      session.user.id,
      session.user.role,
      body.items,
      body.intendedMonth
    );
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
