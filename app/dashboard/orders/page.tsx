"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ShoppingCart } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/supervisor-dashboard";
import { formatCurrency, formatDate } from "@/lib/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const url = statusFilter ? `/api/orders?status=${statusFilter}` : "/api/orders";
  const { data: orders, isLoading } = useSWR(url, fetcher);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
        <Link href="/dashboard/orders/new">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className="shrink-0 text-xs h-8"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No hay pedidos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea tu primer pedido para comenzar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order: { id: string; companyName: string; supervisorName: string; status: string; total: string; createdAt: string }) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{order.companyName}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {order.supervisorName} - {formatDate(order.createdAt)}
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
  );
}
