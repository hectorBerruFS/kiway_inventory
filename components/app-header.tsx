"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ROLE_LABELS } from "@/lib/db/schema";
import { useState } from "react";
import { useSWRConfig } from "swr";

export function AppHeader() {
  const { data: session } = useSession();
  const { mutate } = useSWRConfig();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await mutate(() => true, undefined, { revalidate: false });
      window.location.replace("/api/auth/force-logout");
    } catch (error) {
      console.error("[auth] logout_failed", error);
      window.location.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className="h-8 w-8"
            >
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#2B9FD9", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#1E7BA7", stopOpacity: 1 }} />
                </linearGradient>
              </defs>

              <circle cx="128" cy="128" r="128" fill="url(#grad)" />

              <g transform="translate(128, 128)">
                <line
                  x1="-15"
                  y1="-50"
                  x2="-15"
                  y2="50"
                  stroke="white"
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <line
                  x1="-15"
                  y1="-20"
                  x2="40"
                  y2="-55"
                  stroke="white"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="-15"
                  y1="20"
                  x2="40"
                  y2="55"
                  stroke="white"
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          </div>

          <div>
            <p className="text-sm font-bold leading-none text-foreground">
              Kiway
            </p>

            <p className="text-xs text-muted-foreground">
              {session?.user?.name} -{" "}
              {
                ROLE_LABELS[
                  (session?.user as { role?: number })?.role ?? 0
                ]
              }
            </p>
          </div>
        </div>

          <Button
            onClick={handleLogout} 
            variant="ghost"
            size="icon"
            aria-label="Cerrar sesion"
            disabled={loggingOut}
             
          >
            <LogOut className="h-5 w-5" />
          </Button>
      
      </div>
    </header>
  );
}
