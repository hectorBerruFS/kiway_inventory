import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, ROLES } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 });
  }

  const [existingUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existingUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  if (existingUser.role === ROLES.SUPERADMIN && session.user.role < ROLES.SUPERADMIN) {
    return NextResponse.json({ error: "No puede modificar un usuario Superadmin" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const update: Partial<typeof users.$inferInsert> = {};

  if (Object.hasOwn(input, "name")) {
    if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 255) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    update.name = input.name.trim();
  }

  if (Object.hasOwn(input, "email")) {
    if (
      typeof input.email !== "string" ||
      input.email.trim().length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
    ) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    update.email = input.email.trim().toLowerCase();
  }

  if (Object.hasOwn(input, "role")) {
    if (
      typeof input.role !== "number" ||
      !Number.isInteger(input.role) ||
      input.role < ROLES.STAFF ||
      (input.role > ROLES.ADMIN &&
        !(input.role === ROLES.SUPERADMIN && session.user.role >= ROLES.SUPERADMIN))
    ) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    update.role = Number(input.role);
  }

  if (Object.hasOwn(input, "password")) {
    if (typeof input.password !== "string" || input.password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    update.password = await hash(input.password, 10);
  }

  if (Object.hasOwn(input, "isActive")) {
    if (typeof input.isActive !== "boolean") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    if (id === session.user.id && input.isActive === false) {
      return NextResponse.json({ error: "No puede desactivar su propio usuario" }, { status: 400 });
    }
    update.isActive = input.isActive;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
  }

  try {
    const [updatedUser] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("User update error:", error);
    const code = error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
    if (code === "23505") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario" },
      { status: 500 },
    );
  }
}
