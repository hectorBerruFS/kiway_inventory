"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import Papa from "papaparse";
import { ArrowLeft, Download, FileUp, Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const PRODUCTS_URL = "/api/products?includeInactive=true";
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron cargar los productos");
  return response.json();
};

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string;
  category: string;
  price: string;
  stock: number;
  isActive: boolean;
}

export default function StockSettingsPage() {
  const { data: products, error, isLoading } = useSWR<Product[]>(PRODUCTS_URL, fetcher);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [exporting, setExporting] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (products || []).filter((product) =>
      [product.name, product.brand, product.category, product.sku || ""]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [products, search]);

  function openNewProduct() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch(PRODUCTS_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron cargar los productos");
      const allProducts: Product[] = await response.json();
      if (allProducts.length === 0) {
        toast.error("No hay productos para exportar");
        return;
      }

      const csv = Papa.unparse({
        fields: ["sku", "name", "brand", "category", "price", "stock", "active"],
        data: allProducts.map((product) => [
          product.sku ?? "",
          product.name,
          product.brand,
          product.category,
          product.price,
          product.stock,
          product.isActive,
        ]),
      });
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date();
      const dateLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      link.href = url;
      link.download = `productos-stock-${dateLabel}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (exportError) {
      console.error("Product stock export error:", exportError);
      toast.error("No se pudieron exportar los productos");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Desactivar el producto "${product.name}"?`)) return;
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo desactivar el producto");
      toast.success("Producto desactivado");
      mutate(PRODUCTS_URL);
      mutate("/api/products");
    } catch (deleteError) {
      console.error("Product deactivation error:", deleteError);
      toast.error("No se pudo desactivar el producto");
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8 lg:mx-auto lg:max-w-5xl lg:p-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-10 w-10">
            <Link href="/dashboard/settings" aria-label="Volver a ajustes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">Stock</h1>
            <p className="text-sm text-muted-foreground">La cantidad disponible es informativa.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar CSV
          </Button>
          <Button variant="outline" className="h-10 gap-2" onClick={() => setUploadOpen(true)}>
            <FileUp className="h-4 w-4" />
            Subir listado
          </Button>
          <Button className="h-10 gap-2" onClick={openNewProduct}>
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por producto, marca, categoría o SKU..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error.message}</CardContent></Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center p-10 text-center">
            <Package className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay productos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={!product.isActive ? "opacity-60" : ""}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{product.name}</p>
                    {!product.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactivo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.brand} · {product.category}{product.sku ? ` · SKU: ${product.sku}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{formatCurrency(Number(product.price))}</p>
                    <p className="text-sm text-muted-foreground">Disponible: {product.stock}</p>
                  </div>
                  {product.isActive && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Modificar ${product.name}`}
                        className="h-10 w-10"
                        onClick={() => openEditProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Desactivar ${product.name}`}
                        className="h-10 w-10 text-destructive"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />
      <BulkProductUpdateDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        products={products || []}
      />
    </div>
  );
}

function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  useEffect(() => {
    if (!open) return;
    setName(product?.name || "");
    setSku(product?.sku || "");
    setBrand(product?.brand || "");
    setCategory(product?.category || "");
    setPrice(product?.price || "");
    setStock(String(product?.stock ?? 0));
  }, [open, product]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(product ? `/api/products/${product.id}` : "/api/products", {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product
          ? { price: Number(price), stock: Number(stock) }
          : { name, sku, brand, category, price: Number(price), stock: Number(stock) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "No se pudo guardar el producto");
      }
      toast.success(product ? "Precio y stock actualizados" : "Producto creado");
      mutate(PRODUCTS_URL);
      mutate("/api/products");
      onOpenChange(false);
    } catch (submitError) {
      console.error("Product save error:", submitError);
      toast.error(submitError instanceof Error ? submitError.message : "No se pudo guardar el producto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Modificar precio y cantidad" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!product && (
            <>
              <Field label="Nombre">
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} className="h-11" />
              </Field>
              <Field label="SKU (opcional)">
                <Input value={sku} onChange={(event) => setSku(event.target.value)} maxLength={100} className="h-11" />
              </Field>
              <Field label="Marca">
                <Input value={brand} onChange={(event) => setBrand(event.target.value)} required maxLength={255} className="h-11" />
              </Field>
              <Field label="Categoría">
                <Input value={category} onChange={(event) => setCategory(event.target.value)} required maxLength={255} className="h-11" />
              </Field>
            </>
          )}
          <Field label="Precio">
            <Input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required className="h-11" />
          </Field>
          <Field label="Cantidad disponible">
            <Input type="number" min="0" step="1" value={stock} onChange={(event) => setStock(event.target.value)} required className="h-11" />
          </Field>
          <Button type="submit" disabled={loading} className="h-11">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

type ProductUpdatePreview = {
  id: string;
  name: string;
  sku: string;
  oldPrice: number;
  newPrice?: number;
  oldStock: number;
  newStock?: number;
};

function BulkProductUpdateDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ProductUpdatePreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview([]);
    setErrors([]);
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (result) => {
        const nextPreview: ProductUpdatePreview[] = [];
        const nextErrors: string[] = [];

        result.data.forEach((row, index) => {
          const sku = row.sku?.trim();
          const product = products.find((item) => item.sku?.trim() === sku);
          const priceText = row.price?.trim();
          const stockText = row.stock?.trim();
          const price = priceText ? Number(priceText) : undefined;
          const stock = stockText ? Number(stockText) : undefined;

          if (!sku || !product) {
            nextErrors.push(`Fila ${index + 2}: SKU vacío o producto inexistente`);
            return;
          }
          if (!product.isActive) {
            nextErrors.push(`Fila ${index + 2}: el producto "${sku}" está inactivo`);
            return;
          }
          if ((!priceText && !stockText) ||
            (priceText && (!Number.isFinite(price) || (price as number) < 0)) ||
            (stockText && (!Number.isInteger(stock) || (stock as number) < 0))) {
            nextErrors.push(`Fila ${index + 2}: indique un precio o stock válido (>= 0)`);
            return;
          }

          nextPreview.push({
            id: product.id,
            name: product.name,
            sku,
            oldPrice: Number(product.price),
            newPrice: price,
            oldStock: product.stock,
            newStock: stock,
          });
        });

        if (result.errors.length > 0) {
          nextErrors.push("No se pudo leer correctamente el archivo CSV");
        }
        setPreview(nextPreview);
        setErrors(nextErrors);
      },
      error: (parseError) => {
        console.error("Product CSV parse error:", parseError);
        setErrors(["No se pudo leer el archivo CSV"]);
      },
    });
  }

  async function handleConfirm() {
    if (preview.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/products/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: preview.map(({ id, newPrice, newStock }) => ({
            id,
            ...(typeof newPrice === "number" ? { price: newPrice } : {}),
            ...(typeof newStock === "number" ? { stock: newStock } : {}),
          })),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Error en la actualización");
      toast.success(`Se actualizaron ${result.count} productos`);
      mutate(PRODUCTS_URL);
      mutate("/api/products");
      onOpenChange(false);
      setPreview([]);
      setErrors([]);
    } catch (updateError) {
      console.error("Bulk product update error:", updateError);
      toast.error(updateError instanceof Error ? updateError.message : "Error al actualizar productos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subir listado de productos</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="stock-csv">CSV con columnas: sku, price y/o stock</Label>
            <Input id="stock-csv" type="file" accept=".csv,text/csv" onChange={handleFileChange} className="h-11" />
            <p className="text-xs text-muted-foreground">
              El precio y el stock son opcionales por fila; se requiere al menos uno. Los cambios se identifican por SKU.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="max-h-28 overflow-y-auto rounded-md border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
              <p className="mb-1 font-bold">Revisá el archivo:</p>
              <ul className="list-disc space-y-1 pl-4">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
            </div>
          )}

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">SKU / Producto</th>
                    <th className="p-2 text-right">Precio nuevo</th>
                    <th className="p-2 text-right">Stock nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.sku} · {item.name}</td>
                      <td className="p-2 text-right">{typeof item.newPrice === "number" ? formatCurrency(item.newPrice) : "Sin cambio"}</td>
                      <td className="p-2 text-right">{typeof item.newStock === "number" ? item.newStock : "Sin cambio"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button onClick={handleConfirm} disabled={loading || preview.length === 0 || errors.length > 0} className="h-11">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Confirmar cambios (${preview.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
