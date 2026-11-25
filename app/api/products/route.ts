import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listActiveProducts, listProducts, createProduct } from "@/services/product.service";
import { ROLES } from "@/lib/db/schema";

const PRIVATE_NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    if (new URL(req.url).searchParams.get("includeInactive") === "true") {
      if (session.user.role < ROLES.ADMIN) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      return NextResponse.json(await listProducts(), {
        headers: PRIVATE_NO_CACHE_HEADERS,
      });
    }

    const result = await listActiveProducts();
    return NextResponse.json(result, { headers: PRIVATE_NO_CACHE_HEADERS });
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
      stock: body.stock,
      imageUrl: body.imageUrl,
    });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
