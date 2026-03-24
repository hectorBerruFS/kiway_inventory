"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Minus, Trash2, Loader2, Search, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Error al cargar datos");
  }
  return res.json();
};

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

interface CartItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
}

export default function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCompanyId = searchParams.get("companyId") || "";

  const [companyId, setCompanyId] = useState(preselectedCompanyId);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Extra Auth States
  const [reason, setReason] = useState("");
  const [showAuthForm, setShowAuthForm] = useState(false);

  const {
    data: companies,
    isLoading,
    error,
  } = useSWR<Company[]>("/api/companies", fetcher);

  const { data: products } = useSWR<Product[]>("/api/products", fetcher);

  const selectedCompany = companies?.find((c) => c.id === companyId);
  const budget = selectedCompany ? Number(selectedCompany.monthlyBudget) : 0;
  const consumed = selectedCompany ? Number(selectedCompany.consumedBudget) : 0;

  // month helpers
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  const [intendedMonth, setIntendedMonth] = useState(currentMonth); // YYYY-MM

  const budgetKey = companyId ? `/api/companies/${companyId}/budget?month=${intendedMonth || currentMonth}` : null;
  const { data: projectedBudget, mutate: mutateBudget } = useSWR(budgetKey, fetcher);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const displayedAvailable = Number(projectedBudget?.available ?? Math.max(0, budget - consumed));
  const isOverBudget = cartTotal > displayedAvailable;
  const isLimitReached = !!projectedBudget?.isLimitReached;
  const hasExtraAuth = !!projectedBudget?.hasExtraAuthorization;

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

  async function handleRequestAuth() {
    if (!reason || reason.trim().length < 10) {
      toast.error("Por favor proporcione una justificación de al menos 10 caracteres");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/extra-authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          month: intendedMonth,
          reason
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Solicitud enviada correctamente. El Administrador revisará su pedido.");
      setShowAuthForm(false);
      setReason("");
      mutateBudget();
    } catch (err: any) {
      toast.error(err.message || "Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(isDraft: boolean) {
    if (!companyId) {
      toast.error("Debe seleccionar una empresa");
      return;
    }

    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          intendedMonth: intendedMonth || undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al crear pedido");
      }

      const order = await res.json();

      if (!isDraft) {
        const sendRes = await fetch(`/api/orders/${order.id}/status`, {
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
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Error al cargar empresas
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Nuevo Pedido</h1>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-foreground">Empresa</Label>
        <div className="flex gap-2">
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

          <Select value={intendedMonth} onValueChange={(v) => setIntendedMonth(v)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={currentMonth}>Actual ({now.toLocaleString("es-ES", { month: "long" })})</SelectItem>
              <SelectItem value={nextMonth}>{next.toLocaleString("es-ES", { month: "long" })} (Proyectado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedCompany && hasExtraAuth && (
        <Card className="border-green-500 bg-green-50/30">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div className="flex flex-col">
              <p className="font-bold text-sm text-green-800">Pedido extra autorizado</p>
              <p className="text-xs text-green-700">
                El administrador ha aprobado un pedido adicional para este periodo. Puede proceder.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCompany && isLimitReached && !hasExtraAuth && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <p className="font-bold text-sm">Límite de un pedido por mes alcanzado</p>
                <p className="text-xs">
                  Esta empresa ya tiene un pedido enviado o aprobado para este periodo.
                  Para realizar un pedido adicional, debe solicitar una autorización.
                </p>
              </div>
            </div>

            {!showAuthForm ? (
              <Button onClick={() => setShowAuthForm(true)} variant="outline" className="w-full">
                Solicitar Autorización de Pedido Extra
              </Button>
            ) : (
              <div className="flex flex-col gap-3 border-t border-destructive/20 pt-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Justificación del pedido extra</Label>
                  <Input
                    placeholder="Explique por qué es necesario este pedido..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAuthForm(false)} variant="ghost" size="sm" className="flex-1 h-9">
                    Cancelar
                  </Button>
                  <Button onClick={handleRequestAuth} disabled={loading} size="sm" className="flex-1 h-9">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Solicitud"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedCompany && !isLimitReached && (
        <Card className={`sticky top-0 z-10 ${isOverBudget ? "border-destructive" : (projectedBudget?.isCommittedExceeded ? "border-amber-500" : "")}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Presupuesto disponible:</span>
              <span className={`font-semibold ${isOverBudget ? "text-destructive" : "text-foreground"}`}>
                {formatCurrency(displayedAvailable)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-border">
              <span className="text-muted-foreground">Gasto actual:</span>
              <span className="font-semibold text-foreground">{budget > 0 ? ((cartTotal / budget) * 100).toFixed(1) : "0.0"}%</span>
            </div>
            {projectedBudget?.isCommittedExceeded && (
              <div className="flex items-start gap-2 mt-3 p-2 text-xs text-amber-600 bg-amber-50 rounded-md border border-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> Esta empresa ya tiene pedidos enviados y/o aprobados que igualan o superan su presupuesto para este periodo.
                </span>
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

      {!isLimitReached && cart.length > 0 && (
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
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
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
              <span className="text-lg font-bold text-foreground">{formatCurrency(cartTotal)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLimitReached && cart.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            Guardar Borrador
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar Pedido"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!isLimitReached && (
          <>
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
          </>
        )}

        {!products ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          !isLimitReached && categories.map((category) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              {filteredProducts
                .filter((p) => p.category === category)
                .map((product) => {
                  const inCart = cart.find((i) => i.productId === product.id);
                  return (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl.startsWith('public/') ? product.imageUrl.replace(/^public\//, '/') : product.imageUrl} 
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
          ))
        )}
      </div>
    </div>
  );
}
