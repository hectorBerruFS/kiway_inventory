"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import { ArrowLeft, Loader2, Pencil, Plus, UserRoundCheck, UserRoundX, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ROLE_LABELS, ROLES } from "@/lib/db/schema";
import { toast } from "sonner";

const USERS_URL = "/api/users?includeInactive=true";
const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("No se pudieron cargar los usuarios");
  return response.json();
};

interface User {
  id: string;
  name: string;
  email: string;
  role: number;
  isActive: boolean;
}

const roleBadgeStyles: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-chart-3/15 text-chart-3",
  2: "bg-primary/15 text-primary",
  3: "bg-warning/15 text-warning-foreground",
};

export default function UsersContent({
  currentRole,
  currentUserId,
}: {
  currentRole: number;
  currentUserId: string;
}) {
  const { data: users, error, isLoading } = useSWR<User[]>(USERS_URL, fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function toggleActive(user: User) {
    if (user.isActive && user.id === currentUserId) {
      toast.error("No puede desactivar su propio usuario");
      return;
    }

    const action = user.isActive ? "desactivar" : "reactivar";
    if (user.isActive && !confirm(`¿Desactivar el usuario ${user.name}?`)) return;
    setSavingStatusId(user.id);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `No se pudo ${action} el usuario`);
      toast.success(user.isActive ? "Usuario desactivado" : "Usuario reactivado");
      mutate(USERS_URL);
      mutate("/api/users");
    } catch (statusError) {
      console.error("User status update error:", statusError);
      toast.error(statusError instanceof Error ? statusError.message : `No se pudo ${action} el usuario`);
    } finally {
      setSavingStatusId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 lg:mx-auto lg:max-w-5xl lg:p-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-10 w-10">
            <Link href="/dashboard/settings" aria-label="Volver a Ajustes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">Usuarios</h1>
        </div>
        <Button className="h-10 gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <Card><CardContent className="p-6 text-center text-sm text-destructive">{error.message}</CardContent></Card>
      ) : !users || users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center md:p-16">
            <Users className="mb-3 h-12 w-12 text-muted-foreground md:h-16 md:w-16" />
            <p className="text-sm text-muted-foreground md:text-base">No hay usuarios</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-4 lg:gap-6">
          {users.map((user) => {
            const cannotManage = user.role === ROLES.SUPERADMIN && currentRole < ROLES.SUPERADMIN;
            const isSelf = user.id === currentUserId;
            return (
              <Card key={user.id} className={!user.isActive ? "opacity-70" : ""}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground md:text-base">{user.name}</p>
                      {!user.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                      )}
                      {isSelf && <Badge variant="outline" className="text-xs">Tu usuario</Badge>}
                    </div>
                    <p className="break-all text-xs text-muted-foreground md:text-sm">{user.email}</p>
                    <Badge
                      variant="secondary"
                      className={`mt-2 text-xs md:text-sm ${roleBadgeStyles[user.role] || ""}`}
                    >
                      {ROLE_LABELS[user.role] || "Desconocido"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 gap-2 sm:flex-none"
                      onClick={() => openEdit(user)}
                      disabled={cannotManage}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant={user.isActive ? "ghost" : "outline"}
                      className={`h-10 flex-1 gap-2 sm:flex-none ${user.isActive ? "text-destructive" : ""}`}
                      onClick={() => toggleActive(user)}
                      disabled={cannotManage || isSelf || savingStatusId === user.id}
                      aria-label={user.isActive ? `Desactivar ${user.name}` : `Reactivar ${user.name}`}
                    >
                      {savingStatusId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.isActive ? (
                        <UserRoundX className="h-4 w-4" />
                      ) : (
                        <UserRoundCheck className="h-4 w-4" />
                      )}
                      {user.isActive ? "Dar de baja" : "Reactivar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        canAssignSuperadmin={currentRole >= ROLES.SUPERADMIN}
      />
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
  user,
  canAssignSuperadmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  canAssignSuperadmin: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("1");

  useEffect(() => {
    if (!open) return;
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPassword("");
    setRole(String(user?.role ?? 1));
  }, [open, user]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role: Number(role),
          ...(password ? { password } : {}),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "No se pudo guardar el usuario");

      toast.success(user ? "Usuario actualizado" : "Usuario creado");
      mutate(USERS_URL);
      mutate("/api/users");
      onOpenChange(false);
      setPassword("");
    } catch (saveError) {
      console.error("User save error:", saveError);
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar el usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto md:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name">Nombre</Label>
            <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password">{user ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required={!user}
              minLength={6}
              autoComplete="new-password"
              className="h-11"
            />
            {user && <p className="text-xs text-muted-foreground">Dejá este campo vacío para conservar la contraseña actual.</p>}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(ROLES.STAFF)}>Staff</SelectItem>
                <SelectItem value={String(ROLES.SUPERVISOR)}>Supervisor</SelectItem>
                <SelectItem value={String(ROLES.ADMIN)}>Administrador</SelectItem>
                {canAssignSuperadmin && <SelectItem value={String(ROLES.SUPERADMIN)}>Superadmin</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="h-11 md:h-12 md:text-base">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : user ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
