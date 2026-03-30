"use client";

import { use, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Plus, Minus, Trash2, Loader2, Search, AlertTriangle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Product {
  id: string;
  name: string;
  sku: string | null;
  brand: string;
  category: string;
  price: string;
  imageUrl: string | null;
}

interface Company {
  id: string;
  name: string;
  monthlyBudget: string;
  consumedBudget: string;
}

interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  brandSnapshot: string;
  priceSnapshot: string;
  quantity: number;
}

interface Order {
  id: string;
  companyId: string;
  companyName: string;
  status: string;
  items: OrderItem[];
}

interface CartItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

export default function EditOrderContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [companyId, setCompanyId] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [intendedMonth, setIntendedMonth] = useState<string>("");

  const { data: companies } = useSWR<Company[]>("/api/companies", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: order } = useSWR<Order>(`/api/orders/${id}`, fetcher, {
    onSuccess: (orderData) => {
      if (!orderLoaded && orderData) {
        setCompanyId(orderData.companyId);
        setIntendedMonth((orderData as any).intendedMonth || "");
        // Initialize cart from order items
        const cartItems = orderData.items.map((item) => ({
          productId: item.productId,
          name: item.nameSnapshot,
          brand: item.brandSnapshot,
          price: Number(item.priceSnapshot),
          quantity: item.quantity,
        }));
        setCart(cartItems);
        setOrderLoaded(true);
      }
    },
  });

  // Redirect if not draft
  if (order && order.status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">
          Solo se pueden editar pedidos en estado Borrador
        </p>
        <Link href="/dashboard/orders">
          <Button>Volver a Pedidos</Button>
        </Link>
      </div>
    );
  }

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const budget = selectedCompany ? Number(selectedCompany.monthlyBudget) : 0;
  const consumed = selectedCompany ? Number(selectedCompany.consumedBudget) : 0;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  const budgetKey = companyId ? `/api/companies/${companyId}/budget?month=${intendedMonth || currentMonth}` : null;
  const { data: projectedBudget } = useSWR(budgetKey, fetcher);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const displayedAvailable = Number(projectedBudget?.available ?? Math.max(0, budget - consumed));
  const isOverBudget = cartTotal > displayedAvailable;

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const categories = useMemo(() => {
    if (!filteredProducts) return [];
    return [...new Set(filteredProducts.map((p) => p.category))];
  }, [filteredProducts]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          brand: product.brand,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleSubmit(asDraft: boolean) {
    if (!companyId) {
      toast.error("Selecciona una empresa");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }

    setLoading(true);

    try {
      // Update order items
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          intendedMonth: intendedMonth || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar pedido");
      }

      if (!asDraft) {
        // Send order (server performs validation but does not block)
        const sendRes = await fetch(`/api/orders/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "sent", intendedMonth: intendedMonth || undefined }),
        });
        const sendJson = await sendRes.json();
        if (sendJson?.warning) {
          toast.warning(sendJson.warning.message || "Advertencia de presupuesto");
        } else {
          toast.success("Pedido enviado correctamente");
        }
      } else {
        toast.success("Borrador guardado");
      }

      router.push("/dashboard/orders");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Editar Pedido</h1>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-foreground">Empresa</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Seleccionar empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompany && (
        <Card className={`sticky top-10 z-10 ${isOverBudget ? "border-destructive" : ""}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Presupuesto disponible:</span>
              <span
                className={`font-semibold ${
                  isOverBudget ? "text-destructive" : "text-foreground"
                }`}
              >
                {formatCurrency(budget - consumed)}
              </span>
            </div>
            {cartTotal > 0 && (
              <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
                <span className="text-muted-foreground">Porcentaje del presupuesto:</span>
                <span className="font-semibold text-foreground">{((cartTotal / budget) * 100).toFixed(1)}%</span>
              </div>
            )}
            {isOverBudget && (
              <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>Este pedido excede el presupuesto mensual</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cart Summary */}
      {cart.length > 0 && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm text-foreground">
              Carrito ({cart.length} productos)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-col gap-2">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg bg-muted p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium text-foreground">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.productId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Total:</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {cart.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            Guardar Cambios
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Enviar Pedido"
            )}
          </Button>
        </div>
      )}

      {/* Product Catalog */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">Catalogo de Productos</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {!products ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
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
                      {filteredProducts.filter(p => p.category === category).length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 pt-1 pb-4">
                    {filteredProducts
                      .filter((p) => p.category === category)
                      .map((product) => {
                        const inCart = cart.find((i) => i.productId === product.id);
                        return (
                          <Card
                            key={product.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors border-none bg-muted/30"
                            onClick={() => addToCart(product)}
                          >
                            <CardContent className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background border">
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
                                    {product.brand}{product.sku ? ` | SKU: ${product.sku}` : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {formatCurrency(Number(product.price))}
                                </span>
                                {inCart && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
                                    {inCart.quantity}
                                  </span>
                                )}
                                {!inCart && (
                                  <Plus className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
