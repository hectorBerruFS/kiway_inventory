"use client";

import { use } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, Send, Printer, Loader2, Edit, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/supervisor-dashboard";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useSession } from "next-auth/react";
import { ROLES } from "@/lib/db/schema";
import { toast } from "sonner";
import { useState } from "react";
import { RemitoView } from "@/components/remito-view";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  brandSnapshot: string;
  priceSnapshot: string;
  quantity: number;
}

interface OrderDetail {
  id: string;
  companyId: string;
  companyName: string;
  supervisorId: string;
  supervisorName: string;
  status: string;
  total: string;
  createdAt: string;
  remitoNumber?: number | null;
  items: OrderItem[];
  budgetAssessment?: {
    withinBudget: boolean;
    exceededBy: string;
    month: string;
    monthlyBudget: string;
  };
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: order, isLoading } = useSWR<OrderDetail>(`/api/orders/${id}`, fetcher);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = (session?.user?.role ?? 0) >= ROLES.ADMIN;
  const isOwner = session?.user?.id === order?.supervisorId;

  async function updateStatus(newStatus: string) {
    setActionLoading(newStatus);
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success(
        newStatus === "approved"
          ? "Pedido aprobado"
          : newStatus === "rejected"
          ? "Pedido rechazado"
          : newStatus === "sent"
          ? "Pedido enviado"
          : "Estado actualizado"
      );

      mutate(`/api/orders/${id}`);
      mutate("/api/orders");
      mutate("/api/orders?status=sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar");
    } finally {
      setActionLoading(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Pedido no encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Detalle del Pedido</h1>
            <p className="text-xs text-muted-foreground">ID: {order.id.slice(0, 8)}...</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Empresa</span>
              <span className="font-medium text-foreground">{order.companyName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supervisor</span>
              <span className="font-medium text-foreground">{order.supervisorName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium text-foreground">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(Number(order.total))}</span>
            </div>
            {order.budgetAssessment && (
              <div className="flex justify-between text-sm mt-2 border-t pt-2">
                <span className="text-muted-foreground">Presupuesto (Mes: {order.budgetAssessment.month})</span>
                <span
                  className={`font-medium ${
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
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-foreground">
              Productos ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.nameSnapshot}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.brandSnapshot} - {formatCurrency(Number(item.priceSnapshot))} x {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(Number(item.priceSnapshot) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {order.status === "draft" && isOwner && (
            <div className="flex gap-2">
              <Link href={`/dashboard/orders/${id}/edit`} className="flex-1">
                <Button className="w-full h-12 gap-2">
                  <Edit className="h-5 w-5" />
                  Retomar Pedido
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-12 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => updateStatus("cancelled")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "cancelled" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                Cancelar
              </Button>
            </div>
          )}

          {order.status === "draft" && isOwner && (
            <Button
              className="h-12 gap-2"
              onClick={() => updateStatus("sent")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "sent" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Enviar Pedido
            </Button>
          )}

          {order.status === "sent" && isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => updateStatus("rejected")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "rejected" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                Rechazar
              </Button>
              <Button
                className="flex-1 h-12 gap-2 bg-success text-success-foreground hover:bg-success/90"
                onClick={() => updateStatus("approved")}
                disabled={actionLoading !== null}
              >
                {actionLoading === "approved" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Aprobar
              </Button>
            </div>
          )}

          {order.status === "approved" && (
            <Button variant="outline" className="h-12 gap-2" asChild>
              <a href={`/api/orders/${id}/receipt-pdf`} target="_blank" rel="noopener noreferrer">
                <Printer className="h-5 w-5" />
                Imprimir Remito (PDF A4)
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Always have print-ready remito for approved orders */}
      {order.status === "approved" && (
        <div className="hidden print:block">
          <RemitoView order={order} />
        </div>
      )}
    </>
  );
}
