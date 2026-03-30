"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
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
    <div className="flex flex-col gap-4 p-4 pb-12 md:p-8 md:gap-8 lg:max-w-5xl lg:mx-auto lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 md:text-2xl lg:text-3xl">
          <ReceiptText className="h-6 w-6 text-primary md:h-8 md:w-8" />
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
                className="shrink-0 text-xs h-8 md:text-sm md:h-10 md:px-4"
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
              className="h-9 text-xs w-[180px] md:h-11 md:text-sm md:w-[220px]"
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
            <div className="hidden md:grid md:grid-cols-7 gap-4 px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 rounded-t-lg border-x border-t border-border">
              <div className="col-span-1">Fecha</div>
              <div className="col-span-2">Empresa</div>
              <div className="col-span-1">Estado</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1 text-center">Remito</div>
              <div className="col-span-1 text-center">Mes Aplicado</div>
            </div>

            {orders.map((order: any) => (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <Card className="hover:bg-accent/30 transition-colors overflow-hidden border-l-4 border-l-primary/20">
                  <CardContent className="p-0">
                    {/* Desktop Layout (oculto en móvil) */}
                    <div className="hidden md:grid md:grid-cols-7 gap-4 items-center p-4">
                      <div className="col-span-1 text-xs font-medium">{formatDate(order.createdAt)}</div>
                      <div className="col-span-2">
                        <p className="text-sm font-bold text-foreground truncate md:text-base leading-tight">{order.companyName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{order.supervisorName}</p>
                      </div>
                      <div className="col-span-1">
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="col-span-1 text-right text-sm font-bold text-foreground">
                        {formatCurrency(Number(order.total))}
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs px-2 py-1 bg-muted rounded-md border border-border font-mono">
                          {order.remitoNumber ? String(order.remitoNumber).padStart(6, "0") : "Pendiente"}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs px-2 py-1 bg-muted rounded-md border border-border">
                          {order.intendedMonth || "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Layout (oculto en desktop) */}
                    <div className="flex flex-col gap-3 p-3 md:hidden">
                      {/* Header: Empresa y Estado */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight truncate">{order.companyName}</p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{order.supervisorName}</p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                      
                      {/* Medios: Fecha y Remito (en dos columnas para ahorrar espacio) */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Fecha</span>
                          <span className="font-medium">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Remito</span>
                          <span className="font-mono text-muted-foreground">
                            {order.remitoNumber ? String(order.remitoNumber).padStart(6, "0") : "Pendiente"}
                          </span>
                        </div>
                      </div>

                      {/* Footer: Mes y Total */}
                      <div className="flex justify-between items-end mt-1 pt-2 border-t border-border/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Mes Aplicado</span>
                          <span className="text-[11px] px-2 py-0.5 bg-muted rounded border border-border w-fit text-muted-foreground">
                            {order.intendedMonth || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Total</span>
                          <span className="text-base font-bold text-foreground leading-none">
                            {formatCurrency(Number(order.total))}
                          </span>
                        </div>
                      </div>
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
