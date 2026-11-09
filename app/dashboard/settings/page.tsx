import Link from "next/link";
import { ArrowRight, Boxes, Settings2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-helpers";

const settings = [
  {
    title: "STOCK",
    description: "Productos, precios y cantidades disponibles",
    href: "/dashboard/settings/stock",
    icon: Boxes,
  },
  {
    title: "USUARIOS",
    description: "Administración de usuarios del sistema",
    href: "/dashboard/users",
    icon: Users,
  },
  {
    title: "GENERAL",
    description: "Empresas y configuración general",
    href: "/dashboard/companies",
    icon: Settings2,
  },
];

export default async function SettingsPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8 md:gap-8 lg:mx-auto lg:max-w-5xl lg:p-10">
      <h1 className="text-xl font-bold text-foreground md:text-2xl lg:text-3xl">Ajustes</h1>
      <div className="grid gap-3 md:grid-cols-3 md:gap-5">
        {settings.map(({ title, description, href, icon: Icon }) => (
          <Link key={title} href={href} className="min-h-24">
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardContent className="flex h-full items-center gap-4 p-5 md:flex-col md:items-start md:justify-between md:p-6">
                <Icon className="h-7 w-7 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-muted-foreground md:block" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
