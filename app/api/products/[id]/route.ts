import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateProduct, deactivateProduct } from "@/services/product.service";
import { ROLES } from "@/lib/db/schema";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    // If isActive is being set to false, use deactivateProduct
    if (body.isActive === false) {
      const updated = await deactivateProduct(id);
      return NextResponse.json(updated);
    }

    // Otherwise use updateProduct for field updates
    const updated = await updateProduct(id, {
      name: body.name,
      brand: body.brand,
      category: body.category,
      price: body.price,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (session.user.role < ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const updated = await deactivateProduct(id);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

