import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, profiles, type Profile } from "@/db";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string; profile: Profile };

/** Usuario actual (validado contra Supabase Auth) + su perfil. Cacheado por request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, user.id) });
  if (!profile) return null;
  return { id: user.id, email: user.email ?? profile.email, profile };
});

export function isProfileComplete(p: Profile) {
  return Boolean(p.firstName && p.lastName && p.dni && p.phone && p.birthDate);
}

export async function requireUser(next = "/turnos") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Paciente con perfil completo (DNI, teléfono...). Los usuarios de Google completan su perfil primero. */
export async function requirePatient(next = "/turnos") {
  const user = await requireUser(next);
  if (user.profile.role === "admin") redirect("/admin");
  if (!isProfileComplete(user.profile)) redirect(`/completar-perfil?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.profile.role !== "admin") redirect("/turnos");
  return user;
}

/** Variante para server actions: lanza en lugar de redirigir. */
export async function assertAdmin() {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "admin") throw new Error("No autorizado");
  return user;
}
