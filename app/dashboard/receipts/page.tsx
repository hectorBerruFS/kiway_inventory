"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ReceiptText, FileText } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/supervisor-dashboard";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "sent", label: "Enviado" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
];

export default function ReceiptsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const initialMonth = searchParams.get("month") || "";

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [monthFilter, setMonthFilter] = useState(initialMonth);

  useEffect(() => {
    setStatusFilter(initialStatus);
    setMonthFilter(initialMonth);
  }, [initialStatus, initialMonth]);

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set("status", statusFilter);
  if (monthFilter) queryParams.set("month", monthFilter);

  const url = queryParams.toString() ? `/api/orders?${queryParams.toString()}` : "/api/orders";
  const { data: orders, isLoading } = useSWR(url, fetcher);

  return (
    <div className="flex flex-col gap-4 p-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ReceiptText className="h-6 w-6 text-primary" />
          Histórico de Remitos
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {/* Filtros */}
        <div className="flex flex-col gap-2">
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

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-9 text-xs w-[180px]"
            />
            {monthFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonthFilter("")}
                className="text-[10px] h-7 px-2"
              >
                Limpiar mes
              </Button>
            )}
          </div>
        </div>

        {/* Tabla / Lista */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No se encontraron remitos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ajusta los filtros para ver otros periodos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Cabecera de "tabla" para desktop (opcional, manteniendo mobile first) */}
            <div className="hidden md:grid md:grid-cols-6 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">Fecha</div>
              <div className="col-span-2">Empresa</div>
              <div className="col-span-1">Estado</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1 text-center">Mes Aplicado</div>
            </div>

            {orders.map((order: any) => (
              <Card key={order.id} className="hover:bg-accent/30 transition-colors overflow-hidden border-l-4 border-l-primary/20">
                <CardContent className="p-0">
                  <div className="md:grid md:grid-cols-6 gap-4 items-center p-3">
                    {/* Fecha - Mobile: Top Left */}
                    <div className="col-span-1 flex flex-col md:block">
                      <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold">Fecha</span>
                      <span className="text-xs font-medium">{formatDate(order.createdAt)}</span>
                    </div>

                    {/* Empresa - Mobile: Main Title */}
                    <div className="col-span-2 mt-2 md:mt-0">
                      <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold">Empresa</span>
                      <p className="text-sm font-bold text-foreground">{order.companyName}</p>
                      <p className="text-[10px] text-muted-foreground md:hidden">{order.supervisorName}</p>
                    </div>

                    {/* Estado - Mobile: Top Right */}
                    <div className="col-span-1 mt-2 md:mt-0">
                      <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold block mb-1">Estado</span>
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Total - Mobile: Bottom Right */}
                    <div className="col-span-1 mt-2 md:mt-0 text-left md:text-right">
                      <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold block">Total</span>
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(Number(order.total))}
                      </span>
                    </div>

                    {/* Mes Aplicado - Mobile: Bottom Left */}
                    <div className="col-span-1 mt-2 md:mt-0 text-left md:text-center">
                      <span className="md:hidden text-[10px] uppercase text-muted-foreground font-bold block">Mes Aplicado</span>
                      <span className="text-xs px-2 py-1 bg-muted rounded-md border border-border">
                        {order.intendedMonth || "N/A"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
