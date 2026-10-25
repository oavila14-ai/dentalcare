"use client";

import Link from "next/link";
import { CalendarDays, LayoutDashboard, LogOut, Plus, User } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
  initials,
  isAdmin,
}: {
  name: string;
  email: string;
  initials: string;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-glow outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <div className="truncate">{name}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard /> Panel de administración
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link href="/turnos/nuevo">
                <Plus /> Solicitar turno
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/turnos">
                <CalendarDays /> Mis turnos
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/perfil">
                <User /> Mi perfil
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOutAction()}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
