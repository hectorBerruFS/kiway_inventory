import { db } from "@/lib/db";
import { extraOrderAuthorizations, companies, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Service para gestión de autorizaciones de pedidos extra
 */

export async function requestExtraOrder(
    companyId: string,
    supervisorId: string,
    month: string,
    reason: string
) {
    if (!reason || reason.trim().length < 10) {
        throw new Error("La justificación debe tener al menos 10 caracteres");
    }

    // Verificar si ya existe una solicitud pendiente o autorizada para este mes
    const existing = await db
        .select()
        .from(extraOrderAuthorizations)
        .where(
            and(
                eq(extraOrderAuthorizations.companyId, companyId),
                eq(extraOrderAuthorizations.month, month),
                eq(extraOrderAuthorizations.status, "pending")
            )
        );

    if (existing.length > 0) {
        throw new Error("Ya existe una solicitud pendiente para este mes");
    }

    const [auth] = await db
        .insert(extraOrderAuthorizations)
        .values({
            companyId,
            supervisorId,
            month,
            reason: reason.trim(),
            status: "pending",
        })
        .returning();

    return auth;
}

export async function authorizeExtraOrder(
    authId: string,
    adminId: string,
    approve: boolean = true
) {
    const status = approve ? "authorized" : "rejected";

    if (!adminId) {
        throw new Error("Admin ID es requerido para autorizar");
    }

    const [updated] = await db
        .update(extraOrderAuthorizations)
        .set({
            status,
            adminId,
        })
        .where(eq(extraOrderAuthorizations.id, authId))
        .returning();

    if (!updated) {
        throw new Error("Solicitud no encontrada");
    }

    return updated;
}

export async function getPendingAuthorizations() {
    return await db
        .select({
            id: extraOrderAuthorizations.id,
            companyName: companies.name,
            supervisorName: users.name,
            month: extraOrderAuthorizations.month,
            reason: extraOrderAuthorizations.reason,
            createdAt: extraOrderAuthorizations.createdAt,
        })
        .from(extraOrderAuthorizations)
        .leftJoin(companies, eq(extraOrderAuthorizations.companyId, companies.id))
        .leftJoin(users, eq(extraOrderAuthorizations.supervisorId, users.id))
        .where(eq(extraOrderAuthorizations.status, "pending"))
        .orderBy(desc(extraOrderAuthorizations.createdAt));
}

export async function validateAuthorization(
    companyId: string,
    month: string
): Promise<string | null> {
    const [auth] = await db
        .select()
        .from(extraOrderAuthorizations)
        .where(
            and(
                eq(extraOrderAuthorizations.companyId, companyId),
                eq(extraOrderAuthorizations.month, month),
                eq(extraOrderAuthorizations.status, "authorized")
            )
        );

    return auth ? auth.id : null;
}

export async function consumeAuthorization(authId: string) {
    await db
        .update(extraOrderAuthorizations)
        .set({ status: "used" })
        .where(eq(extraOrderAuthorizations.id, authId));
}
