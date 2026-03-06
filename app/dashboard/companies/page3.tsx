"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Building2, Pencil, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Company {
  id: string;
  name: string;
  monthlyBudget: string;
  supervisorId: string;
  supervisorName: string;
  consumedBudget: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: number;
}

export default function CompaniesPage() {
  const { data: companies, isLoading } = useSWR<Company[]>("/api/companies", fetcher);
  const { data: users } = useSWR<User[]>("/api/users", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const supervisors = users?.filter((u) => u.role >= 1) || [];

  function openEdit(company: Company) {
    setEditingCompany(company);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingCompany(null);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Empresas</h1>
        <Button size="sm" className="gap-1" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !companies || companies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No hay empresas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {companies.map((company) => {
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
                          Supervisor: {company.supervisorName}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(company)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Presupuesto mensual</span>
                      <span className="font-semibold text-foreground">{formatCurrency(budget)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Consumido este mes</span>
                      <span className={isOverBudget ? "font-semibold text-destructive" : "text-foreground"}>
                        {formatCurrency(consumed)}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={`h-2 ${isOverBudget ? "[&>div]:bg-destructive" : ""}`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editingCompany}
        supervisors={supervisors}
      />
    </div>
  );
}

function CompanyDialog({
  open,
  onOpenChange,
  company,
  supervisors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
  supervisors: User[];
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  // Sincronizar estado cuando cambia la empresa o se abre el diálogo
  useEffect(() => {
    if (company) {
      setName(company.name);
      setMonthlyBudget(company.monthlyBudget);
      setSupervisorId(company.supervisorId);
    } else {
      setName("");
      setMonthlyBudget("");
      setSupervisorId("");
    }
  }, [company, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body = { name, monthlyBudget: Number(monthlyBudget), supervisorId };
      const url = company ? `/api/companies/${company.id}` : "/api/companies";
      const method = company ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error al guardar");

      toast.success(company ? "Empresa actualizada" : "Empresa creada");
      mutate("/api/companies");
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar empresa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {company ? "Editar Empresa" : "Nueva Empresa"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Presupuesto Mensual</Label>
            <Input
              type="number"
              step="0.01"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              required
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Supervisor</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Seleccionar supervisor" />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="h-11">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : company ? (
              "Guardar Cambios"
            ) : (
              "Crear Empresa"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

