import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, ROLES } from "@/lib/db/schema";

type ProductUpdate = {
  id: string;
  price?: number;
  stock?: number;
};

function isValidUpdate(value: unknown): value is ProductUpdate {
  if (!value || typeof value !== "object") return false;
  const update = value as Record<string, unknown>;
  if (typeof update.id !== "string" || !update.id) return false;

  const hasPrice = Object.hasOwn(update, "price");
  const hasStock = Object.hasOwn(update, "stock");
  if (!hasPrice && !hasStock) return false;

  return (
    (!hasPrice || (typeof update.price === "number" && Number.isFinite(update.price) && update.price >= 0)) &&
    (!hasStock || (typeof update.stock === "number" && Number.isInteger(update.stock) && update.stock >= 0))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as { updates?: unknown }).updates)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const updates = (body as { updates: unknown[] }).updates;
    if (updates.length === 0 || !updates.every(isValidUpdate)) {
      return NextResponse.json({ error: "Cada producto debe incluir un precio o stock válido" }, { status: 400 });
    }

    const priceUpdates = updates.filter((update) => typeof update.price === "number");
    const stockUpdates = updates.filter((update) => typeof update.stock === "number");
    const uniqueIds = [...new Set(updates.map((update) => update.id))];

    if (uniqueIds.length !== updates.length) {
      return NextResponse.json({ error: "El archivo contiene productos duplicados" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(inArray(products.id, uniqueIds), eq(products.isActive, true)));

      if (existing.length !== uniqueIds.length) {
        throw new Error("Uno o más productos no existen o están inactivos");
      }

      if (priceUpdates.length > 0) {
        const priceCase = sql`CASE ${products.id} ${sql.join(
          priceUpdates.map((update) => sql`WHEN ${update.id} THEN ${update.price}::numeric`),
          sql` `,
        )} ELSE ${products.price} END`;
        await tx
          .update(products)
          .set({ price: priceCase })
          .where(inArray(products.id, priceUpdates.map((update) => update.id)));
      }

      if (stockUpdates.length > 0) {
        const stockCase = sql`CASE ${products.id} ${sql.join(
          stockUpdates.map((update) => sql`WHEN ${update.id} THEN ${update.stock}::integer`),
          sql` `,
        )} ELSE ${products.stock} END`;
        await tx
          .update(products)
          .set({ stock: stockCase })
          .where(inArray(products.id, stockUpdates.map((update) => update.id)));
      }
    });

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error("Bulk product update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en la actualización masiva" },
      { status: 400 },
    );
  }
}
