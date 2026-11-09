import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, ROLES } from "@/lib/db/schema";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const includeInactive = new URL(req.url).searchParams.get("includeInactive") === "true";
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);

  return NextResponse.json(includeInactive ? result : result.filter((user) => user.isActive));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body: unknown = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, email, password, role } = body as Record<string, unknown>;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 255 ||
    normalizedEmail.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== "string"
  ) {
    return NextResponse.json({ error: "Nombre, email y contraseña son obligatorios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }
  if (
    typeof role !== "number" ||
    !Number.isInteger(role) ||
    role < ROLES.STAFF ||
    (role > ROLES.ADMIN && !(role === ROLES.SUPERADMIN && session.user.role >= ROLES.SUPERADMIN))
  ) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  try {
    const hashedPassword = await hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User creation error:", error);
    const code = error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
    if (code === "23505") {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
  }
}
