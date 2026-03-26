import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLES, products } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { updates } = await req.json(); // Array de { id: string, price: number }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Filtrar solo actualizaciones válidas
    const validUpdates = updates.filter(
      (u) => u.id && typeof u.price === "number" && !isNaN(u.price)
    );

    if (validUpdates.length === 0) {
      return NextResponse.json({ success: false, message: "No hubo cambios válidos" });
    }

    console.time("bulk-update-prices");
    console.log(`[API] Iniciando actualización de ${validUpdates.length} productos...`);

    // Realizar las actualizaciones en una única consulta optimizada (CASE statement)
    await db.transaction(async (tx) => {
      const sqlChunks = [sql`CASE id` ];
      validUpdates.forEach(u => {
        sqlChunks.push(sql`WHEN ${u.id} THEN ${u.price.toString()}::numeric`);
      });
      sqlChunks.push(sql`END`);
      
      const caseExpression = sql.join(sqlChunks, sql.raw(' '));

      await tx
        .update(products)
        .set({ price: caseExpression })
        .where(inArray(products.id, validUpdates.map(u => u.id)));
    });

    console.timeEnd("bulk-update-prices");
    console.log(`[API] Actualización completada.`);

    return NextResponse.json({ success: true, count: validUpdates.length });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Error en la actualización masiva" }, { status: 500 });
  }
}
