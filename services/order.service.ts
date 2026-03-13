import { db } from "@/lib/db";
import { orders, orderItems, products, companies, users } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getAvailableBudget, checkMonthlyOrderLimit } from "./budget.service";
import { getProductsByIds } from "./product.service";
import { validateAuthorization, consumeAuthorization } from "./authorization.service";

/**
 * Service para gestión de pedidos
 * Encapsula toda la lógica de negocio de pedidos
 */

// Valid order state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["approved", "rejected"],
};

export interface CreateOrderInput {
  companyId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  intendedMonth?: string; // optional YYYY-MM
}

export interface UpdateOrderInput {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  intendedMonth?: string;
}

export interface OrderListFilters {
  status?: "draft" | "sent" | "approved" | "rejected" | "cancelled";
  companyId?: string;
  month?: string; // YYYY-MM
}

// Helper: Calculate order total from items
async function calculateOrderTotal(
  items: Array<{ productId: string; quantity: number }>
): Promise<{ total: number; productMap: Map<string, any> }> {
  const productIds = items.map((i) => i.productId);
  const productMap = await getProductsByIds(productIds);

  let total = 0;
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Producto no encontrado: ${item.productId}`);
    }
    total += Number(product.price) * item.quantity;
  }

  return { total, productMap };
}

export async function createOrder(
  userId: string,
  userRole: number,
  input: CreateOrderInput
) {
  /**
   * Crea un nuevo pedido en estado "draft"
   * Validaciones:
   * - Usuario es supervisor o admin
   * - Usuario tiene acceso a la empresa
   * - Items no están vacíos
   * - Límite de un pedido por mes (o autorización extra)
   */

  if (!input.companyId || !input.items || input.items.length === 0) {
    throw new Error("Datos incompletos: companyId e items requeridos");
  }

  const SUPERVISOR_ROLE = 1;
  const ADMIN_ROLE = 2;

  if (userRole < SUPERVISOR_ROLE) {
    throw new Error("No autorizado: solo supervisores y admins pueden crear pedidos");
  }

  // Determine target month
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonth = input.intendedMonth || currentYM;

  // Verify user has access to company
  if (userRole < ADMIN_ROLE) {
    const [company] = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.id, input.companyId),
          eq(companies.supervisorId, userId)
        )
      );

    if (!company) {
      throw new Error("No tiene acceso a esta empresa");
    }

    // Check monthly limit for supervisors
    const limitReached = await checkMonthlyOrderLimit(input.companyId, targetMonth);
    if (limitReached) {
      const authId = await validateAuthorization(input.companyId, targetMonth);
      if (!authId) {
        throw new Error("Límite de un pedido por mes alcanzado. Debe solicitar autorización para un pedido extra.");
      }
    }
  }

  // Calculate total with validation
  const { total, productMap } = await calculateOrderTotal(input.items);

  // Create order
  const [order] = await db
    .insert(orders)
    .values({
      companyId: input.companyId,
      supervisorId: userId,
      status: "draft",
      total: String(total),
      intendedMonth: targetMonth,
    })
    .returning();

  // Create order items with snapshots
  const orderItemsData = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);

    return {
      orderId: order.id,
      productId: item.productId,
      nameSnapshot: product.name,
      brandSnapshot: product.brand,
      priceSnapshot: String(product.price),
      quantity: item.quantity,
    };
  });

  await db.insert(orderItems).values(orderItemsData);

  return order;
}

export async function sendOrder(
  orderId: string,
  userId: string,
  userRole: number,
  intendedMonth?: string
) {
  /**
   * Envía un pedido (draft → sent)
   * Validaciones:
   * - Estado debe ser "draft"
   * - Solo el creador puede enviar
   * - Requiere al menos un item
   */

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.status !== "draft") {
    throw new Error(`No se puede enviar un pedido en estado ${order.status}`);
  }

  if (order.supervisorId !== userId) {
    throw new Error("No autorizado: solo el creador puede enviar el pedido");
  }

  // Verify order has items
  const [itemCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (!itemCount || itemCount.count === 0) {
    throw new Error("El pedido debe contener al menos un item");
  }

  // Perform budget validation for the month of sending or the order's intendedMonth if set
  const [freshOrder] = await db.select().from(orders).where(eq(orders.id, orderId));

  // determine target month for validation: use order.intendedMonth if present, otherwise use current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonth = (freshOrder as any).intendedMonth || currentYearMonth;

  // fetch company budget
  const [company] = await db.select().from(companies).where(eq(companies.id, freshOrder.companyId));
  const monthlyBudget = company?.monthlyBudget || "0";

  // perform budget validation... (existing logic)
  const { isValid, available, message } = await import("./budget.service").then((m) =>
    m.validateBudgetForOrder(freshOrder.companyId, monthlyBudget, Number(freshOrder.total), targetMonth)
  );

  // Mark authorization as used if applicable
  const authId = await validateAuthorization(freshOrder.companyId, targetMonth);
  if (authId) {
    await consumeAuthorization(authId);
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "sent" })
    .where(eq(orders.id, orderId))
    .returning();

  // return updated plus optional warning info (do not block send)
  const result: any = { order: updated };
  if (!isValid) {
    result.warning = { message: message || "Presupuesto insuficiente", available };
  }

  return result;
}

export async function approveOrder(
  orderId: string,
  userId: string,
  userRole: number
) {
  /**
   * Aprueba un pedido (sent → approved)
   * Validaciones:
   * - Estado debe ser "sent"
   * - Solo admin puede aprobar
   * - Actualiza snapshots desde productos actuales
   */

  const ADMIN_ROLE = 2;
  if (userRole < ADMIN_ROLE) {
    throw new Error("No autorizado: solo administradores pueden aprobar");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.status !== "sent") {
    throw new Error(`No se puede aprobar un pedido en estado ${order.status}`);
  }

  // Update snapshots from current product data
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of items) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId));

    if (product) {
      await db
        .update(orderItems)
        .set({
          nameSnapshot: product.name,
          brandSnapshot: product.brand,
          priceSnapshot: String(product.price),
        })
        .where(eq(orderItems.id, item.id));
    }
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "approved" })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}

export async function rejectOrder(
  orderId: string,
  userId: string,
  userRole: number
) {
  /**
   * Rechaza un pedido (sent → rejected)
   * Validaciones:
   * - Estado debe ser "sent"
   * - Solo admin puede rechazar
   */

  const ADMIN_ROLE = 2;
  if (userRole < ADMIN_ROLE) {
    throw new Error("No autorizado: solo administradores pueden rechazar");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.status !== "sent") {
    throw new Error(`No se puede rechazar un pedido en estado ${order.status}`);
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "rejected" })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}

export async function cancelOrder(
  orderId: string,
  userId: string,
  userRole: number
) {
  /**
   * Cancela un pedido (draft → cancelled)
   * Validaciones:
   * - Estado debe ser "draft"
   * - Solo el creador o admin puede cancelar
   */

  const ADMIN_ROLE = 2;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.status !== "draft") {
    throw new Error(
      `No se puede cancelar un pedido en estado ${order.status}. Solo borradores pueden cancelarse`
    );
  }

  if (userRole < ADMIN_ROLE && order.supervisorId !== userId) {
    throw new Error("No autorizado: solo el creador o admin puede cancelar");
  }

  const [updated] = await db
    .update(orders)
    .set({ status: "cancelled" })
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}

export async function updateOrderItems(
  orderId: string,
  userId: string,
  userRole: number,
  items: Array<{ productId: string; quantity: number }>,
  intendedMonth?: string
) {
  /**
   * Actualiza items de un pedido
   * Validaciones:
   * - Estado debe ser "draft"
   * - Solo el creador puede editar
   * - Items se validan contra productos
   */

  if (!items || items.length === 0) {
    throw new Error("Items requeridos");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.status !== "draft") {
    throw new Error("Solo se pueden editar pedidos en estado draft");
  }

  if (order.supervisorId !== userId) {
    throw new Error("No autorizado: solo el creador puede editar el pedido");
  }

  // Calculate new total
  const { total, productMap } = await calculateOrderTotal(items);

  // Delete existing items
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));

  // Insert new items
  const newItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) throw new Error("Producto no encontrado");

    return {
      orderId,
      productId: item.productId,
      nameSnapshot: product.name,
      brandSnapshot: product.brand,
      priceSnapshot: String(product.price),
      quantity: item.quantity,
    };
  });

  await db.insert(orderItems).values(newItems);

  // Update order total
  const setPayload: any = { total: String(total) };
  if (typeof intendedMonth !== "undefined") {
    setPayload.intendedMonth = intendedMonth || null;
  }

  const [updated] = await db
    .update(orders)
    .set(setPayload)
    .where(eq(orders.id, orderId))
    .returning();

  return updated;
}

export interface OrderWithItems {
  id: string;
  companyId: string;
  companyName: string | null;
  supervisorId: string;
  supervisorName: string | null;
  status: string;
  total: string;
  createdAt: Date;
  intendedMonth?: string | null;
  items: any[];
}

export async function getOrderWithItems(
  orderId: string,
  userId: string,
  userRole: number
): Promise<OrderWithItems> {
  /**
   * Obtiene un pedido con sus items
   * Validaciones de autorización según rol
   */

  const ADMIN_ROLE = 2;

  const [order] = await db
    .select({
      id: orders.id,
      companyId: orders.companyId,
      intendedMonth: orders.intendedMonth,
      companyName: companies.name,
      supervisorId: orders.supervisorId,
      supervisorName: users.name,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.supervisorId, users.id))
    .where(eq(orders.id, orderId));

  if (!order) {
    throw new Error("Pedido no encontrado");
  }

  // Supervisor can only see their own orders
  if (userRole < ADMIN_ROLE && order.supervisorId !== userId) {
    throw new Error("No autorizado");
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
}

export async function listOrders(
  userId: string,
  userRole: number,
  filters?: OrderListFilters
) {
  /**
   * Lista pedidos según filtros y rol del usuario
   * Supervisores ven solo sus pedidos
   * Admins ven todos
   */

  const ADMIN_ROLE = 2;
  const conditions = [];

  // Role-based filtering
  if (userRole < ADMIN_ROLE) {
    conditions.push(eq(orders.supervisorId, userId));
  }

  // Apply status filter if provided
  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status));
  }

  // Apply company filter if provided
  if (filters?.companyId) {
    conditions.push(eq(orders.companyId, filters.companyId));
  }

  // Apply month filter if provided
  if (filters?.month) {
    conditions.push(eq(orders.intendedMonth, filters.month));
  }

  const result = await db
    .select({
      id: orders.id,
      companyId: orders.companyId,
      companyName: companies.name,
      supervisorId: orders.supervisorId,
      supervisorName: users.name,
      status: orders.status,
      total: orders.total,
      intendedMonth: orders.intendedMonth,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.supervisorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));

  return result;
}
