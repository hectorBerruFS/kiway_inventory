import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrderWithItems } from "@/services/order.service";
import { renderRemitoPdf } from "@/lib/pdf/remito-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await getOrderWithItems(id, session.user.id, session.user.role);

    if (order.status !== "approved") {
      return NextResponse.json(
        { error: "Solo se pueden generar remitos PDF para pedidos aprobados" },
        { status: 400 }
      );
    }

    const pdf = await renderRemitoPdf(order);
    const remitoNumber = order.remitoNumber
      ? String(order.remitoNumber).padStart(6, "0")
      : order.id.slice(0, 8).toUpperCase();

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="remito-${remitoNumber}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error generando PDF";

    if (message.includes("@react-pdf/renderer")) {
      return NextResponse.json(
        {
          error:
            "Falta instalar @react-pdf/renderer en el entorno. Ejecutá: npm install @react-pdf/renderer",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
