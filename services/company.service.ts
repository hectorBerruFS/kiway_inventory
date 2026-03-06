import { db } from "@/lib/db";
import { companies, users, orders } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getMonthlyConsumedBudget, getAvailableBudget } from "./budget.service";

/**
 * Service para gestión de empresas
 * Encapsula lógica de empresas y presupuestos
 */

export interface CompanyInput {
  name: string;
  monthlyBudget: string | number;
  supervisorId: string;
}

export async function createCompany(input: CompanyInput) {
  if (!input.name?.trim()) {
    throw new Error("Nombre requerido");
  }

  if (input.monthlyBudget === undefined || input.monthlyBudget === null) {
    throw new Error("Presupuesto requerido");
  }

  const budgetNumber = Number(input.monthlyBudget);
  if (isNaN(budgetNumber) || budgetNumber < 0) {
    throw new Error("Presupuesto inválido");
  }

  if (!input.supervisorId) {
    throw new Error("Supervisor requerido");
  }

  // Verificar supervisor
  const [supervisor] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.supervisorId));

  if (!supervisor) {
    throw new Error("Supervisor no encontrado");
  }

  const [company] = await db
    .insert(companies)
    .values({
      name: input.name.trim(),
      monthlyBudget: String(budgetNumber),
      supervisorId: input.supervisorId,
    })
    .returning();

  return company;
}

export async function updateCompanyBudget(
  companyId: string,
  newBudget: string | number
) {
  if (!companyId) {
    throw new Error("ID de empresa requerido");
  }

  if (newBudget === undefined || newBudget === null) {
    throw new Error("Nuevo presupuesto requerido");
  }

  const budgetNumber = Number(newBudget);
  if (isNaN(budgetNumber) || budgetNumber < 0) {
    throw new Error("Presupuesto inválido");
  }

  const [updated] = await db
    .update(companies)
    .set({ monthlyBudget: String(budgetNumber) })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updated) {
    throw new Error("Empresa no encontrada");
  }

  return updated;
}

export async function updateCompany(
  companyId: string,
  updates: Partial<{
    name: string;
    monthlyBudget: string | number;
    supervisorId: string;
  }>
) {
  if (!companyId) {
    throw new Error("ID de empresa requerido");
  }

  const updateData: Partial<typeof companies.$inferInsert> = {};

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      throw new Error("Nombre inválido");
    }
    updateData.name = updates.name.trim();
  }

  if (updates.monthlyBudget !== undefined) {
    const budgetNumber = Number(updates.monthlyBudget);
    if (isNaN(budgetNumber) || budgetNumber < 0) {
      throw new Error("Presupuesto inválido");
    }
    updateData.monthlyBudget = String(budgetNumber);
  }

  if (updates.supervisorId !== undefined) {
    const [supervisor] = await db
      .select()
      .from(users)
      .where(eq(users.id, updates.supervisorId));

    if (!supervisor) {
      throw new Error("Supervisor no encontrado");
    }

    updateData.supervisorId = updates.supervisorId;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No hay datos para actualizar");
  }

  const [updated] = await db
    .update(companies)
    .set(updateData)
    .where(eq(companies.id, companyId))
    .returning();

  if (!updated) {
    throw new Error("Empresa no encontrada");
  }

  return updated;
}

export interface CompanyWithBudget {
  id: string;
  name: string;
  monthlyBudget: string;
  supervisorId: string;
  supervisorName: string | null;
  createdAt: Date;
  consumedBudget: string;
  availableBudget: string;
  currentOrderStatus: string | null;
}

export async function getCompanyWithBudgetUsage(
  companyId: string
): Promise<CompanyWithBudget> {
  if (!companyId) {
    throw new Error("ID de empresa requerido");
  }

  const [company] = await db
    .select({
      id: companies.id,
      name: companies.name,
      monthlyBudget: companies.monthlyBudget,
      supervisorId: companies.supervisorId,
      supervisorName: users.name,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .leftJoin(users, eq(companies.supervisorId, users.id))
    .where(eq(companies.id, companyId));

  if (!company) {
    throw new Error("Empresa no encontrada");
  }

  const consumed = await getMonthlyConsumedBudget(companyId);
  const available = await getAvailableBudget(
    company.monthlyBudget,
    companyId
  );

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [lastOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.companyId, companyId), eq(orders.intendedMonth, currentYM)))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  return {
    ...company,
    consumedBudget: consumed,
    availableBudget: available,
    currentOrderStatus: lastOrder?.status || null,
  };
}

export async function getCompaniesWithBudgets(
  filterBySupervisorId?: string
): Promise<CompanyWithBudget[]> {
  let query = db
    .select({
      id: companies.id,
      name: companies.name,
      monthlyBudget: companies.monthlyBudget,
      supervisorId: companies.supervisorId,
      supervisorName: users.name,
      createdAt: companies.createdAt,
    })
    .from(companies)
    .leftJoin(users, eq(companies.supervisorId, users.id))
    .$dynamic();

  if (filterBySupervisorId) {
    query = query.where(eq(companies.supervisorId, filterBySupervisorId));
  }

  const companiesList = await query;

  return Promise.all(
    companiesList.map(async (company) => {
      const consumed = await getMonthlyConsumedBudget(company.id);
      const available = await getAvailableBudget(
        company.monthlyBudget,
        company.id
      );

      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [lastOrder] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, company.id),
            eq(orders.intendedMonth, currentYM)
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(1);

      return {
        ...company,
        consumedBudget: consumed,
        availableBudget: available,
        currentOrderStatus: lastOrder?.status || null,
      };
    })
  );
}

export async function verifyCompanyAccess(
  companyId: string,
  userId: string,
  userRole: number
): Promise<boolean> {
  const ADMIN_ROLE = 2;

  if (userRole >= ADMIN_ROLE) {
    return true;
  }

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        eq(companies.id, companyId),
        eq(companies.supervisorId, userId)
      )
    );

  return !!company;
}