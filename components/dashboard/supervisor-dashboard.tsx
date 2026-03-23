"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, ShoppingCart, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Company {
  id: string;
  name: string;
  monthlyBudget: string;
  consumedBudget: string;
  currentOrderStatus: string | null;
}

interface Order {
  id: string;
  companyName: string;
  status: string;
  total: string;
  createdAt: string;
  budgetAssessment?: {
    withinBudget: boolean;
    exceededBy: string;
    month: string;
  };
}

export function SupervisorDashboard({ userId }: { userId: string }) {
  const { data: companies, isLoading: loadingCompanies } = useSWR<Company[]>("/api/companies", fetcher);
  const { data: orders, isLoading: loadingOrders } = useSWR<Order[]>("/api/orders", fetcher);

  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mis Empresas</h1>
        <Link href="/dashboard/orders/new">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Nuevo Pedido
          </Button>
        </Link>
      </div>

      {loadingCompanies ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {companies?.map((company) => {
            const budget = Number(company.monthlyBudget);
            const consumed = Number(company.consumedBudget);
            const percentage = budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0;
            const isOverBudget = consumed > budget;

            return (
              <Card key={company.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                        <Building2 className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{company.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Presupuesto: {formatCurrency(budget)}
                        </p>
                      </div>
                    </div>
                    <Link href={`/dashboard/orders/new?companyId=${company.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
                        <Plus className="h-3 w-3" />
                        Pedir
                      </Button>
                    </Link>
                  </div>

                  {(company.currentOrderStatus === "sent" || company.currentOrderStatus === "approved") && (
                    <div className="flex gap-2 mb-3">
                      {company.currentOrderStatus === "sent" && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 gap-1 py-1">
                          <Clock className="h-3 w-3" />
                          Pedido en curso
                        </Badge>
                      )}
                      {company.currentOrderStatus === "approved" && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-100 gap-1 py-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Pedido aprobado
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Consumido</span>
                      <span className={isOverBudget ? "font-semibold text-destructive" : "text-foreground"}>
                        {formatCurrency(consumed)} / {formatCurrency(budget)}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                    />
                    {isOverBudget && (
                      <p className="text-xs font-medium text-destructive">
                        Presupuesto excedido en {formatCurrency(consumed - budget)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground">Pedidos Recientes</h2>
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm" className="text-xs">
              Ver todos
            </Button>
          </Link>
        </div>

        {loadingOrders ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No hay pedidos aun</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{order.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(Number(order.total))}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                    {order.budgetAssessment && (
                      <div className="flex items-center justify-between gap-2 border-t pt-2 mt-1">
                        <p
                          className={`text-[11px] font-medium ${
                            order.budgetAssessment.withinBudget
                              ? "text-green-600"
                              : "text-amber-700"
                          }`}
                        >
                          {order.budgetAssessment.withinBudget
                            ? "En presupuesto"
                            : `Excede por ${formatCurrency(
                                Number(order.budgetAssessment.exceededBy)
                              )}`}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          Mes: {order.budgetAssessment.month}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    draft: { label: "Borrador", className: "bg-muted text-muted-foreground" },
    sent: { label: "Enviado", className: "bg-chart-3/15 text-chart-3" },
    approved: { label: "Aprobado", className: "bg-success/15 text-success" },
    rejected: { label: "Rechazado", className: "bg-destructive/15 text-destructive" },
    cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
  };

  const v = variants[status] || variants.draft;

  return (
    <Badge variant="secondary" className={`text-xs font-medium ${v.className}`}>
      {v.label}
    </Badge>
  );
}
