"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Inbox, LayoutDashboard, ListChecks, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/admin/pendientes", label: "Pendientes", icon: Inbox, badge: true },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/admin/turnos", label: "Turnos", icon: ListChecks },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav({ pendingCount, onNavigate }: { pendingCount: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-gradient" />}
            <item.icon className={cn("size-[18px]", active && "text-primary")} />
            {item.label}
            {item.badge && pendingCount > 0 && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
