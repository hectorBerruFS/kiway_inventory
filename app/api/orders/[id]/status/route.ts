import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendOrder, approveOrder, rejectOrder, cancelOrder } from "@/services/order.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "Estado requerido" }, { status: 400 });
  }

  try {
    let result;

    switch (status) {
      case "sent":
        result = await sendOrder(id, session.user.id, session.user.role, body.intendedMonth);
        break;
      case "approved":
        result = await approveOrder(id, session.user.id, session.user.role);
        break;
      case "rejected":
        result = await rejectOrder(id, session.user.id, session.user.role);
        break;
      case "cancelled":
        result = await cancelOrder(id, session.user.id, session.user.role);
        break;
      default:
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

