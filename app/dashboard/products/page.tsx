"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR, { mutate } from "swr";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Search, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string;
  category: string;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
}

export default function ProductsPage() {
  const { data: products, isLoading } = useSWR<Product[]>("/api/products", fetcher);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const filtered = products?.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const categories = filtered ? [...new Set(filtered.map((p) => p.category))] : [];

  function openEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Desactivar este producto?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    toast.success("Producto desactivado");
    mutate("/api/products");
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Productos</h1>
        <Button size="sm" className="gap-1" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay productos</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {categories.map((category) => (
            <AccordionItem key={category} value={category} className="border-b border-muted">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {filtered?.filter(p => p.category === category).length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 pt-1 pb-4">
                  {filtered
                    ?.filter((p) => p.category === category)
                    .map((product) => (
                      <Card key={product.id} className="border-none bg-muted/30">
                        <CardContent className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-12 w-12 shrink-0 bg-background rounded-md overflow-hidden border">
                              {product.imageUrl ? (
                                <img 
                                  src={
                                    product.imageUrl.startsWith('public/') 
                                      ? product.imageUrl.replace(/^public\//, '/') 
                                      : (product.imageUrl.startsWith('/') ? product.imageUrl : `/${product.imageUrl}`)
                                  } 
                                  alt={product.name} 
                                  className="h-full w-full object-cover" 
                                />
                              ) : (
                                <Package className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.brand}{product.sku ? ` | SKU: ${product.sku}` : ""} - {formatCurrency(Number(product.price))}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product?.name || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [category, setCategory] = useState(product?.category || "");
  const [price, setPrice] = useState(product?.price || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");

  // Manejar el reset cuando se abre para un NUEVO producto
  useEffect(() => {
    if (open && !product) {
      setName("");
      setSku("");
      setBrand("");
      setCategory("");
      setPrice("");
      setImageUrl("");
    }
  }, [open, product]);

  // Reset form when product changes (edit mode)
  useEffect(() => {
    if (open && product) {
      setName(product.name || "");
      setSku(product.sku || "");
      setBrand(product.brand || "");
      setCategory(product.category || "");
      setPrice(product.price || "");
      
      let initialImg = product.imageUrl || "";
      if (initialImg.includes('/img/products/') && initialImg.endsWith('.jpg')) {
        initialImg = initialImg.split('/img/products/').pop()?.replace('.jpg', '') || "";
      }
      setImageUrl(initialImg);
    }
  }, [open, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageUrl && !imageUrl.includes('/')) {
        finalImageUrl = `/img/products/${imageUrl.replace(/\.jpg$/, '')}.jpg`;
      }

      const body = { name, sku, brand, category, price: Number(price), imageUrl: finalImageUrl || '/img/products/default.jpg' };
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(product ? "Producto actualizado" : "Producto creado");
      mutate("/api/products");
      onOpenChange(false);
      setName("");
      setSku("");
      setBrand("");
      setCategory("");
      setPrice("");
      setImageUrl("");
    } catch {
      toast.error("Error al guardar producto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {product ? "Editar Producto" : "Nuevo Producto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-11" placeholder="Ej: Resma A4" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">SKU (Opcional)</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-11" placeholder="Ej: RES-A4-001" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Marca</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} required className="h-11" placeholder="Ej: Ledesma" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} required className="h-11" placeholder="Ej: Librería" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Nombre de Imagen (Opcional)</Label>
            <Input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-11" placeholder="Ej: zapatillas_nike" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Precio</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="h-11"
              placeholder="Ej: 1500.50"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : product ? "Guardar Cambios" : "Crear Producto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
