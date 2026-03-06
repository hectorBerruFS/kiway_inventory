import { db } from "@/lib/db";
import { companies, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
  /**
   * Crea una nueva empresa
   */
  if (!input.name || !input.monthlyBudget || !input.supervisorId) {
    throw new Error("Datos incompletos para crear empresa");
  }

  // Verify supervisor exists
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
      name: input.name,
      monthlyBudget: String(input.monthlyBudget),
      supervisorId: input.supervisorId,
    })
    .returning();

  return company;
}

export async function updateCompanyBudget(companyId: string, newBudget: string | number) {
  /**
   * Actualiza el presupuesto mensual de una empresa
   */
  if (!companyId || !newBudget) {
    throw new Error("ID de empresa y nuevo presupuesto requeridos");
  }

  const [updated] = await db
    .update(companies)
    .set({ monthlyBudget: String(newBudget) })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updated) {
    throw new Error("Empresa no encontrada");
  }

  return updated;
}

export async function updateCompany(
  companyId: string,
  updates: Partial<{ name: string; monthlyBudget: string | number; supervisorId: string }>
) {
  /**
   * Actualiza múltiples campos de una empresa
   */
  if (!companyId) {
    throw new Error("ID de empresa requerido");
  }

  const updateData: any = {};

  if (updates.name) {
    updateData.name = updates.name;
  }
  if (updates.monthlyBudget) {
    updateData.monthlyBudget = String(updates.monthlyBudget);
  }
  if (updates.supervisorId) {
    // Verify supervisor exists
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
}

export async function getCompanyWithBudgetUsage(
  companyId: string
): Promise<CompanyWithBudget> {
  /**
   * Obtiene una empresa con su presupuesto consumido y disponible
   * Cálculos dinámicos, NO persistentes
   */
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
  const available = await getAvailableBudget(company.monthlyBudget, companyId);

  return {
    ...company,
    consumedBudget: consumed,
    availableBudget: available,
  };
}

export async function getCompaniesWithBudgets(
  filterBySupervisorId?: string
): Promise<CompanyWithBudget[]> {
  /**
   * Obtiene lista de empresas con presupuestos
   * Opcionalmente filtrada por supervisor
   */
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
    .leftJoin(users, eq(companies.supervisorId, users.id));

  if (filterBySupervisorId) {
    query = query.where(eq(companies.supervisorId, filterBySupervisorId));
  }

  const companiesList = await query;

  const companiesWithBudgets = await Promise.all(
    companiesList.map(async (company) => {
      const consumed = await getMonthlyConsumedBudget(company.id);
      const available = await getAvailableBudget(company.monthlyBudget, company.id);

      return {
        ...company,
        consumedBudget: consumed,
        availableBudget: available,
      };
    })
  );

  return companiesWithBudgets;
}

export async function verifyCompanyAccess(
  companyId: string,
  userId: string,
  userRole: number
): Promise<boolean> {
  /**
   * Verifica si un usuario tiene acceso a una empresa
   * Admins ven todas, otros solo sus propias
   */
  const ADMIN_ROLE = 2;

  if (userRole >= ADMIN_ROLE) {
    return true;
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.supervisorId, userId));

  return company?.id === companyId;
}
