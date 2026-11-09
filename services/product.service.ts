import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Service para gestión de productos
 * Regla: No eliminar físicamente, solo desactivar (isActive = false)
 */

export interface ProductInput {
  name: string;
  sku?: string;
  brand: string;
  category: string;
  price: string | number;
  stock?: number;
  imageUrl?: string;
}

export async function createProduct(input: ProductInput) {
  /**
   * Crea un nuevo producto activo
   */
  if (!input.name || !input.brand || !input.category || input.price === undefined || input.price === "") {
    throw new Error("Datos incompletos para crear producto");
  }
  if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
    throw new Error("El precio debe ser un número mayor o igual a cero");
  }
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new Error("El stock debe ser un entero mayor o igual a cero");
  }

  const [product] = await db
    .insert(products)
    .values({
      name: input.name,
      sku: input.sku || null,
      brand: input.brand,
      category: input.category,
      price: String(input.price),
      stock: input.stock ?? 0,
      imageUrl: input.imageUrl?.trim() || null,
    })
    .returning();

  return product;
}

export async function updateProduct(productId: string, input: Partial<ProductInput>) {
  /**
   * Actualiza un producto existente (nombre, marca, categoría, precio)
   */
  if (!productId) {
    throw new Error("ID de producto requerido");
  }
  if (input.price !== undefined && (!Number.isFinite(Number(input.price)) || Number(input.price) < 0)) {
    throw new Error("El precio debe ser un número mayor o igual a cero");
  }
  if (input.stock !== undefined && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new Error("El stock debe ser un entero mayor o igual a cero");
  }

  const updateData: any = {};
  if (input.name) updateData.name = input.name;
  if (typeof input.sku !== "undefined") updateData.sku = input.sku || null;
  if (input.brand) updateData.brand = input.brand;
  if (input.category) updateData.category = input.category;
  if (typeof input.price !== "undefined") updateData.price = String(input.price);
  if (typeof input.stock !== "undefined") updateData.stock = input.stock;
  if (typeof input.imageUrl !== "undefined") updateData.imageUrl = input.imageUrl?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    throw new Error("No hay datos para actualizar");
  }

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, productId))
    .returning();

  if (!updated) {
    throw new Error("Producto no encontrado");
  }

  return updated;
}

export async function deactivateProduct(productId: string) {
  /**
   * Desactiva un producto (isActive = false)
   * No se elimina físicamente
   */
  if (!productId) {
    throw new Error("ID de producto requerido");
  }

  const [deactivated] = await db
    .update(products)
    .set({ isActive: false })
    .where(eq(products.id, productId))
    .returning();

  if (!deactivated) {
    throw new Error("Producto no encontrado");
  }

  return deactivated;
}

export async function listActiveProducts() {
  /**
   * Lista solo productos activos, ordenados por categoría y nombre
   */
  const result = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(products.category, products.name);

  return result;
}

export async function listProducts() {
  return db.select().from(products).orderBy(products.category, products.name);
}

export async function getProductById(productId: string) {
  /**
   * Obtiene un producto por ID (activo o inactivo)
   */
  if (!productId) {
    throw new Error("ID de producto requerido");
  }

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    throw new Error(`Producto no encontrado: ${productId}`);
  }

  return product;
}

export async function getProductsByIds(productIds: string[]) {
  /**
   * Obtiene múltiples productos por sus IDs
   * Retorna un Map para acceso rápido
   */
  if (!productIds || productIds.length === 0) {
    return new Map();
  }

  const allProducts = await db
    .select()
    .from(products)
    .where(sql`${products.id} IN ${productIds}`);

  return new Map(allProducts.map((p) => [p.id, p]));
}
