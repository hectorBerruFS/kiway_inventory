"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Package, Building2, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { StatusBadge } from "./supervisor-dashboard";
import { formatCurrency } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Order {
  id: string;
  companyName: string;
  supervisorName: string;
  status: string;
  total: string;
  createdAt: string;
}

interface ExtraAuth {
  id: string;
  companyName: string;
  supervisorName: string;
  month: string;
  reason: string;
  createdAt: string;
}

export function AdminDashboard() {
  const { data: pendingOrders, isLoading: ordersLoading } = useSWR<Order[]>(
    "/api/orders?status=sent",
    fetcher
  );
  const { data: allOrders } = useSWR<Order[]>("/api/orders", fetcher);

  const { data: extraAuths, mutate: mutateAuths, isLoading: authsLoading } = useSWR<ExtraAuth[]>(
    "/api/extra-authorizations",
    fetcher
  );

  async function handleAction(id: string, approve: boolean) {
    try {
      const res = await fetch(`/api/extra-authorizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      if (!res.ok) throw new Error("Error al procesar acción");
      mutateAuths();
    } catch (error) {
      console.error(error);
    }
  }

  const stats = {
    pending: pendingOrders?.length || 0,
    approved: allOrders?.filter((o) => o.status === "approved").length || 0,
    rejected: allOrders?.filter((o) => o.status === "rejected").length || 0,
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-12">
      <h1 className="text-xl font-bold text-foreground">Panel de Administracion</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <Clock className="h-5 w-5 text-chart-3 mb-1" />
            <span className="text-2xl font-bold text-foreground">{stats.pending}</span>
            <span className="text-xs text-muted-foreground">Pendientes</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-2xl font-bold text-foreground">{stats.approved}</span>
            <span className="text-xs text-muted-foreground">Aprobados</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-3">
            <XCircle className="h-5 w-5 text-destructive mb-1" />
            <span className="text-2xl font-bold text-foreground">{stats.rejected}</span>
            <span className="text-xs text-muted-foreground">Rechazados</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link href="/dashboard/orders">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center p-4">
              <ShoppingCart className="h-6 w-6 text-primary mb-1" />
              <span className="text-xs font-medium text-foreground">Pedidos</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/products">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center p-4">
              <Package className="h-6 w-6 text-primary mb-1" />
              <span className="text-xs font-medium text-foreground">Productos</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/companies">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center p-4">
              <Building2 className="h-6 w-6 text-primary mb-1" />
              <span className="text-xs font-medium text-foreground">Empresas</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Autorizaciones Extra Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Solicitudes de Pedido Extra
        </h2>

        {authsLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : !extraAuths || extraAuths.length === 0 ? (
          <Card className="border-border bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">No hay solicitudes de pedidos extra pendientes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {extraAuths.map((auth) => (
              <Card key={auth.id} className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-foreground">{auth.companyName}</p>
                      <p className="text-xs text-muted-foreground">Periodo: {auth.month}</p>
                    </div>
                  </div>
                  <div className="bg-white/50 p-2 rounded border border-amber-100 mb-3">
                    <p className="text-xs italic text-foreground">"{auth.reason}"</p>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-destructive border-destructive/20 hover:bg-destructive/5"
                      onClick={() => handleAction(auth.id, false)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                      onClick={() => handleAction(auth.id, true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Autorizar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Solicitado por: {auth.supervisorName} - {new Date(auth.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-foreground">Pedidos Pendientes de Aprobacion</h2>

        {ordersLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !pendingOrders || pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">No hay pedidos pendientes</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingOrders.map((order) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">{order.companyName}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Por: {order.supervisorName} -{" "}
                        {new Date(order.createdAt).toLocaleDateString("es-AR")}
                      </p>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>
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
