import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLES, products } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { updates } = await req.json(); // Array of { id: string, price: number }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Realizar las actualizaciones en una transacción
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(products)
          .set({ price: update.price.toString() })
          .where(eq(products.id, update.id));
      }
    });

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Error en la actualización masiva" }, { status: 500 });
  }
}
