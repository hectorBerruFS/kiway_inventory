"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, ShoppingCart, Package, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/db/schema";

const supervisorNav = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
];

const adminNav = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/dashboard/products", label: "Productos", icon: Package },
  { href: "/dashboard/companies", label: "Empresas", icon: Building2 },
  { href: "/dashboard/users", label: "Usuarios", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? 0;

  const navItems = role >= ROLES.ADMIN ? adminNav : supervisorNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
