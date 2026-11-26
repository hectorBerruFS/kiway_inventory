"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ShoppingCart, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/supervisor-dashboard";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Order {
  id: string;
  companyName: string | null;
  supervisorName: string | null;
  status: string;
  total: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
];

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const monthParam = searchParams.get("month");
  const initialMonth = monthParam === "all" ? "" : monthParam || getCurrentMonth();

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [monthFilter, setMonthFilter] = useState(initialMonth);

  // si cambia el query param (ej: navegás entre filtros con links), actualiza el estado
  useEffect(() => {
    setStatusFilter(initialStatus);
    setMonthFilter(initialMonth);
  }, [initialStatus, initialMonth]);

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  queryParams.set("month", monthFilter || "all");

  const url = `/api/orders?${queryParams.toString()}`;
  const { data: orders, isLoading } = useSWR<Order[]>(url, fetcher);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8 md:gap-8 lg:max-w-5xl lg:mx-auto lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">Pedidos</h1>
        <Link href="/dashboard/orders/new" prefetch={false}>
          <Button size="sm" className="gap-1 md:h-10 md:px-4 md:text-sm">
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className="shrink-0 text-xs h-8 md:h-10 md:px-4 md:text-sm"
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-9 text-xs w-[180px] md:h-10 md:text-sm md:w-[220px]"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthFilter(monthFilter ? "" : getCurrentMonth())}
            className="text-[10px] h-7 px-2 md:text-xs md:h-8"
          >
            {monthFilter ? "Ver todo el historial" : "Mes actual"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center md:p-16">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3 md:h-16 md:w-16" />
            <p className="text-sm font-medium text-foreground md:text-base">No hay pedidos</p>
            <p className="text-xs text-muted-foreground mt-1 md:text-sm">
              Crea tu primer pedido para comenzar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((order) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`} prefetch={false}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-3 md:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground md:text-base">{order.companyName}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground md:text-sm">
                      {order.supervisorName} - {formatDate(order.createdAt)}
                    </p>
                    <span className="text-sm font-bold text-foreground md:text-base">
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
