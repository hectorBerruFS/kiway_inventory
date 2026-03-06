import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, eq, sql, inArray, or, isNull, gte, lt } from "drizzle-orm";

/**
 * Service para calcular presupuestos
 * Toda lógica de presupuesto centralizada aquí
 */

export async function getMonthlyConsumedBudget(
  companyId: string,
  yearMonth?: string // formato "YYYY-MM"
): Promise<string> {
  /**
   * Calcula el presupuesto consumido en el mes indicado (o mes actual si no se pasa)
   * Solo cuenta pedidos con status "approved"
   */
  let start: Date;
  let end: Date;

  if (yearMonth) {
    // parse "YYYY-MM"
    const [y, m] = yearMonth.split("-").map((v) => Number(v));
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const targetYM = yearMonth || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.companyId, companyId),
        eq(orders.status, "approved"),
        or(
          eq(orders.intendedMonth, targetYM),
          and(
            isNull(orders.intendedMonth),
            gte(orders.createdAt, start),
            lt(orders.createdAt, end)
          )
        )
      )
    );

  return result?.total || "0";
}

export async function getAvailableBudget(
  monthlyBudget: string | number,
  companyId: string
  , yearMonth?: string
): Promise<string> {
  /**
   * Calcula presupuesto disponible = presupuesto mensual - consumido
   * Se recalcula dinámicamente, nunca persiste
   */
  const consumed = await getMonthlyConsumedBudget(companyId, yearMonth);
  const available = Number(monthlyBudget) - Number(consumed);
  return String(Math.max(0, available));
}

export async function getMonthlyCommittedBudget(
  companyId: string,
  yearMonth?: string // formato "YYYY-MM"
): Promise<string> {
  /**
   * Calcula el presupuesto comprometido en el mes indicado (o mes actual si no se pasa)
   * Cuenta pedidos con status "approved" y "sent"
   */
  let start: Date;
  let end: Date;

  if (yearMonth) {
    const [y, m] = yearMonth.split("-").map((v) => Number(v));
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 1);
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const targetYM = yearMonth || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

  const [result] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.companyId, companyId),
        inArray(orders.status, ["approved", "sent"]),
        or(
          eq(orders.intendedMonth, targetYM),
          and(
            isNull(orders.intendedMonth),
            gte(orders.createdAt, start),
            lt(orders.createdAt, end)
          )
        )
      )
    );

  return result?.total || "0";
}

export async function getCommittedBudgetExceeded(
  monthlyBudget: string | number,
  companyId: string,
  yearMonth?: string
): Promise<{ isExceeded: boolean; committed: string }> {
  /**
   * Verifica si el presupuesto comprometido supera o iguala el mensual
   */
  const committed = await getMonthlyCommittedBudget(companyId, yearMonth);
  const isExceeded = Number(committed) >= Number(monthlyBudget);
  return { isExceeded, committed };
}

export async function validateBudgetForOrder(
  companyId: string,
  monthlyBudget: string | number,
  orderTotal: number,
  yearMonth?: string
): Promise<{ isValid: boolean; message?: string; available?: string }> {
  /**
   * Valida si existe presupuesto disponible
   * Retorna validez, pero NO bloquea envío si se excede
   */
  const available = await getAvailableBudget(monthlyBudget, companyId, yearMonth);
  const availableNum = Number(available);

  if (orderTotal > availableNum) {
    return {
      isValid: false,
      message: `Presupuesto insuficiente. Disponible: ${available}`,
      available,
    };
  }

  return { isValid: true, available };
}

export async function checkMonthlyOrderLimit(
  companyId: string,
  month: string
): Promise<boolean> {
  /**
   * Verifica si ya existe un pedido 'sent' o 'approved' para la empresa y mes
   */
  const [existing] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.companyId, companyId),
        eq(orders.intendedMonth, month),
        inArray(orders.status, ["sent", "approved"])
      )
    );

  return (existing?.count || 0) > 0;
}
