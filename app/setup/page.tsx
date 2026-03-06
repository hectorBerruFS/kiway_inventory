"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Droplets, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; credentials?: { admin: string; supervisor: string }; error?: string } | null>(null);

  async function runSetup() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Error de conexion" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Droplets className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Configuracion Inicial</CardTitle>
          <CardDescription className="text-muted-foreground">
            Inicializa la base de datos con las tablas y datos de ejemplo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={runSetup}
            disabled={loading}
            className="h-12 text-base"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            Inicializar Base de Datos
          </Button>

          {result?.success && (
            <div className="rounded-lg bg-success/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold text-success">Configuracion exitosa</span>
              </div>
              <p className="text-sm text-foreground mb-2">{result.message}</p>
              {result.credentials && (
                <div className="flex flex-col gap-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Admin:</span>{" "}
                    {result.credentials.admin}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Supervisor:</span>{" "}
                    {result.credentials.supervisor}
                  </p>
                </div>
              )}
            </div>
          )}

          {result?.error && (
            <div className="rounded-lg bg-destructive/10 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium text-destructive">{result.error}</span>
              </div>
            </div>
          )}

          {result?.success && (
            <Button
              variant="outline"
              className="h-11"
              onClick={() => (window.location.href = "/login")}
            >
              Ir al Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
