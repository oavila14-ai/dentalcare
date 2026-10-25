"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AdminNav } from "./admin-nav";

export function AdminMobileNav({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <Menu />
          {pendingCount > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-teal" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-muted p-4 pt-14">
        <SheetTitle className="sr-only">Menú de administración</SheetTitle>
        <AdminNav pendingCount={pendingCount} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
