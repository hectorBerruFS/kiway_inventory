import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listActiveProducts, createProduct } from "@/services/product.service";
import { ROLES } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const result = await listActiveProducts();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const product = await createProduct({
      name: body.name,
      sku: body.sku,
      brand: body.brand,
      category: body.category,
      price: body.price,
      imageUrl: body.imageUrl,
    });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

