import { db } from "@/lib/db";
import { orders, orderItems, products, companies, users, remitos } from "@/lib/db/schema";
import { eq, and, sql, desc, isNull, gte, lt, or, inArray } from "drizzle-orm";
import { checkMonthlyOrderLimit } from "./budget.service";
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

export interface OrderBudgetAssessment {
  withinBudget: boolean;
  exceededBy: string;
  availableBeforeApproval: string;
  approvedConsumed: string;
  monthlyBudget: string;
  month: string;
}

export interface OrderListItem {
  id: string;
  companyId: string;
  companyName: string | null;
  supervisorId: string;
  supervisorName: string | null;
  status: string;
  total: string;
  intendedMonth?: string | null;
  remitoNumber?: number | null;
  createdAt: Date;
  budgetAssessment?: OrderBudgetAssessment;
}

interface OrderListItemWithBudgetSource extends OrderListItem {
  companyMonthlyBudget: string | null;
}

function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function resolveOrderMonth(order: Pick<OrderListItem, "intendedMonth" | "createdAt">): string {
  if (order.intendedMonth) {
    return order.intendedMonth;
  }

  return formatYearMonth(new Date(order.createdAt));
}

function getMonthBounds(yearMonth: string): { start: Date; end: Date } {
  const [year, month] = yearMonth.split("-").map((value) => Number(value));
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

async function attachBudgetAssessment(
  ordersList: OrderListItemWithBudgetSource[]
): Promise<OrderListItem[]> {
  if (ordersList.length === 0) {
    return [];
  }

  const uniquePairs = new Map<
    string,
    { companyId: string; month: string; monthlyBudget: string }
  >();

  for (const order of ordersList) {
    const month = resolveOrderMonth(order);
    const monthlyBudget = order.companyMonthlyBudget ?? "0";
    uniquePairs.set(`${order.companyId}:${month}`, {
      companyId: order.companyId,
      month,
      monthlyBudget: String(monthlyBudget),
    });
  }

  const pairConditions = Array.from(uniquePairs.values()).flatMap(({ companyId, month }) => {
    const { start, end } = getMonthBounds(month);

    return [
      and(eq(orders.companyId, companyId), eq(orders.intendedMonth, month)),
      and(
        eq(orders.companyId, companyId),
        isNull(orders.intendedMonth),
        gte(orders.createdAt, start),
        lt(orders.createdAt, end)
      ),
    ];
  });

  const approvedOrders = await db
    .select({
      companyId: orders.companyId,
      total: orders.total,
      intendedMonth: orders.intendedMonth,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.status, "approved"),
        pairConditions.length > 0 ? or(...pairConditions) : undefined
      )
    );

  const approvedByPair = new Map<string, number>();

  for (const approvedOrder of approvedOrders) {
    const month =
      approvedOrder.intendedMonth ?? formatYearMonth(new Date(approvedOrder.createdAt));
    const key = `${approvedOrder.companyId}:${month}`;
    const current = approvedByPair.get(key) ?? 0;
    approvedByPair.set(key, current + Number(approvedOrder.total));
  }

  return ordersList.map((order) => {
    const month = resolveOrderMonth(order);
    const key = `${order.companyId}:${month}`;
    const approvedConsumed = approvedByPair.get(key) ?? 0;
    const monthlyBudget = Number(order.companyMonthlyBudget ?? 0);
    const availableBeforeApproval = Math.max(0, monthlyBudget - approvedConsumed);
    const exceededBy = Math.max(0, Number(order.total) - availableBeforeApproval);

    return {
      id: order.id,
      companyId: order.companyId,
      companyName: order.companyName,
      supervisorId: order.supervisorId,
      supervisorName: order.supervisorName,
      status: order.status,
      total: order.total,
      intendedMonth: order.intendedMonth,
      remitoNumber: order.remitoNumber,
      createdAt: order.createdAt,
      budgetAssessment: {
        withinBudget: exceededBy === 0,
        exceededBy: String(exceededBy),
        availableBeforeApproval: String(availableBeforeApproval),
        approvedConsumed: String(approvedConsumed),
        monthlyBudget: String(order.companyMonthlyBudget ?? 0),
        month,
      },
    };
  });
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
   * - Actualiza snapshots desde productos actuales (re-congelar precios al momento de aprobar)
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

  // 1. Obtener todos los items del pedido primero para evitar N+1
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) {
    throw new Error("El pedido no tiene items");
  }

  // 2. Obtener la información actual de todos los productos en UN solo query
  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const productMap = await getProductsByIds(productIds);

  // 3. Ejecutar actualizaciones en una sola transacción para eficiencia e integridad
  const itemsWithProducts = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Producto no encontrado para el item ${item.id}`);
    }

    return { item, product };
  });

  await db.transaction(async (tx) => {
    const itemIds = itemsWithProducts.map(({ item }) => item.id);
    const nameSnapshotCase = sql<string>`case
      ${sql.join(
        itemsWithProducts.map(
          ({ item, product }) => sql`when ${orderItems.id} = ${item.id} then ${product.name}`
        ),
        sql.raw(" ")
      )}
      else ${orderItems.nameSnapshot}
    end`;
    const brandSnapshotCase = sql<string>`case
      ${sql.join(
        itemsWithProducts.map(
          ({ item, product }) => sql`when ${orderItems.id} = ${item.id} then ${product.brand}`
        ),
        sql.raw(" ")
      )}
      else ${orderItems.brandSnapshot}
    end`;
    const priceSnapshotCase = sql<string>`case
      ${sql.join(
        itemsWithProducts.map(
          ({ item, product }) => sql`when ${orderItems.id} = ${item.id} then ${String(product.price)}`
        ),
        sql.raw(" ")
      )}
      else ${orderItems.priceSnapshot}
    end`;

    await tx
      .update(orderItems)
      .set({
        nameSnapshot: nameSnapshotCase,
        brandSnapshot: brandSnapshotCase,
        priceSnapshot: priceSnapshotCase,
      })
      .where(and(eq(orderItems.orderId, orderId), inArray(orderItems.id, itemIds)));

    // Actualizar estado del pedido
    await tx
      .update(orders)
      .set({ status: "approved" })
      .where(eq(orders.id, orderId));

    // Asegurar que exista el registro de remito para numeración
    await tx
      .insert(remitos)
      .values({ orderId })
      .onConflictDoNothing({ target: remitos.orderId });
  });

  return { ...order, status: "approved" };
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
  remitoNumber?: number | null;
  items: any[];
  budgetAssessment?: OrderBudgetAssessment;
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
      companyMonthlyBudget: companies.monthlyBudget,
      supervisorId: orders.supervisorId,
      supervisorName: users.name,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      remitoNumber: remitos.internalNumber,
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.supervisorId, users.id))
    .leftJoin(remitos, eq(remitos.orderId, orders.id))
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

  let budgetAssessment = undefined;
  if (order.status === "sent" || order.status === "approved" || order.status === "draft" || order.status === "rejected" || order.status === "cancelled") {
    const assessed = await attachBudgetAssessment([order as any]);
    budgetAssessment = assessed[0]?.budgetAssessment;
  }

  const { companyMonthlyBudget: _companyMonthlyBudget, ...cleanOrder } = order as any;

  return { ...cleanOrder, items, budgetAssessment };
}

export async function listOrders(
  userId: string,
  userRole: number,
  filters?: OrderListFilters
): Promise<OrderListItem[]> {
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
      companyMonthlyBudget: companies.monthlyBudget,
      supervisorId: orders.supervisorId,
      supervisorName: users.name,
      status: orders.status,
      total: orders.total,
      intendedMonth: orders.intendedMonth,
      remitoNumber: remitos.internalNumber,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(companies, eq(orders.companyId, companies.id))
    .leftJoin(users, eq(orders.supervisorId, users.id))
    .leftJoin(remitos, eq(remitos.orderId, orders.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));

  const normalizedResult: OrderListItem[] = result.map(
    ({ companyMonthlyBudget: _companyMonthlyBudget, ...order }) => order
  );

  if (normalizedResult.some((o) => o.status === "sent" || o.status === "approved" || o.status === "draft" || o.status === "rejected" || o.status === "cancelled")) {
    return attachBudgetAssessment(result);
  }

  return normalizedResult;
}
