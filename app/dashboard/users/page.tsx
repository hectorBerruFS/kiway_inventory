"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
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
import { Plus, Users, Loader2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/db/schema";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface User {
  id: string;
  name: string;
  email: string;
  role: number;
}

const roleBadgeStyles: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-chart-3/15 text-chart-3",
  2: "bg-primary/15 text-primary",
  3: "bg-warning/15 text-warning-foreground",
};

export default function UsersPage() {
  const { data: users, isLoading } = useSWR<User[]>("/api/users", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-8 md:gap-8 lg:max-w-5xl lg:mx-auto lg:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">Usuarios</h1>
        <Button size="sm" className="gap-1 md:h-10 md:px-4 md:text-sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !users || users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center md:p-16">
            <Users className="h-12 w-12 text-muted-foreground mb-3 md:h-16 md:w-16" />
            <p className="text-sm text-muted-foreground md:text-base">No hay usuarios</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:gap-4 lg:gap-6">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-3 md:p-4">
                <div>
                  <p className="text-sm font-medium text-foreground md:text-base">{user.name}</p>
                  <p className="text-xs text-muted-foreground md:text-sm">{user.email}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs md:text-sm ${roleBadgeStyles[user.role] || ""}`}
                >
                  {ROLE_LABELS[user.role] || "Desconocido"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function UserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("1");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: Number(role) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear usuario");
      }

      toast.success("Usuario creado");
      mutate("/api/users");
      onOpenChange(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm md:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Nuevo Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Contrasena</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-foreground">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Staff</SelectItem>
                <SelectItem value="1">Supervisor</SelectItem>
                <SelectItem value="2">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="h-11 md:h-12 md:text-base">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Crear Usuario"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
