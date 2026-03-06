import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, ROLES } from "@/lib/db/schema";
import { hashSync } from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const hashedPassword = hashSync(password, 10);

  try {
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
        role: role ?? ROLES.STAFF,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "El email ya existe" }, { status: 409 });
  }
}
