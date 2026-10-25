"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, profiles } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  loginSchema,
  passwordSchema,
  profileSchema,
  signUpSchema,
  type ActionResult,
} from "@/lib/validations";
import { z } from "zod";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Evita redirecciones abiertas: solo rutas internas. */
function safeNext(next: unknown, fallback = "/turnos") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signUpAction(input: unknown): Promise<ActionResult<{ email: string; signedIn: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const dniTaken = await db.query.profiles.findFirst({ where: eq(profiles.dni, d.dni), columns: { id: true } });
  if (dniTaken) {
    return { ok: false, error: "Ese DNI ya está registrado", fieldErrors: { dni: "Ya existe una cuenta con este DNI. ¿Olvidaste tu contraseña?" } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/turnos/nuevo`,
      data: {
        first_name: d.firstName,
        last_name: d.lastName,
        dni: d.dni,
        phone: d.phone,
        birth_date: d.birthDate,
        insurance: d.insurance,
        privacy_accepted: true,
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "La contraseña es muy débil", fieldErrors: { password: "Elige una contraseña más segura" } };
    if (error.code === "over_email_send_rate_limit") return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
    return { ok: false, error: "No pudimos crear la cuenta. Intenta de nuevo." };
  }

  // Supabase no revela si el email ya existe: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "Ese email ya está registrado", fieldErrors: { email: "Ya existe una cuenta con este email. Inicia sesión." } };
  }

  // Si en Supabase está desactivado "Confirm email", el usuario ya queda con sesión iniciada.
  if (data.session) revalidatePath("/", "layout");
  return { ok: true, data: { email: d.email, signedIn: Boolean(data.session) } };
}

export async function signInAction(input: unknown, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { ok: false, error: "Confirma tu email antes de ingresar. Revisa tu bandeja de entrada." };
    return { ok: false, error: "Email o contraseña incorrectos" };
  }

  const user = await getSessionUser();
  revalidatePath("/", "layout");
  redirect(user?.profile.role === "admin" ? safeNext(next, "/admin") : safeNext(next));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogleAction(next?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function requestPasswordResetAction(email: string): Promise<ActionResult> {
  const parsed = z.email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: "Email inválido", fieldErrors: { email: "Email inválido" } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/restablecer`,
  });
  // Siempre "ok" para no revelar qué emails están registrados.
  return { ok: true };
}

export async function updatePasswordAction(password: string): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: "Contraseña inválida", fieldErrors: { password: parsed.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "La nueva contraseña debe ser distinta a la anterior" };
    return { ok: false, error: "El enlace venció. Solicita uno nuevo." };
  }
  return { ok: true };
}

/** Guarda los datos personales (perfil propio). */
export async function updateProfileAction(input: unknown, privacyAccepted = false): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Ingresa de nuevo." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;

  const dniOwner = await db.query.profiles.findFirst({ where: eq(profiles.dni, d.dni), columns: { id: true } });
  if (dniOwner && dniOwner.id !== user.id) {
    return { ok: false, error: "Ese DNI ya está registrado", fieldErrors: { dni: "Este DNI pertenece a otra cuenta" } };
  }
  if (!user.profile.privacyAcceptedAt && !privacyAccepted) {
    return { ok: false, error: "Debes aceptar la política de privacidad", fieldErrors: { privacy: "Requerido" } };
  }

  await db
    .update(profiles)
    .set({
      firstName: d.firstName,
      lastName: d.lastName,
      dni: d.dni,
      phone: d.phone,
      birthDate: d.birthDate,
      insurance: d.insurance || null,
      ...(!user.profile.privacyAcceptedAt ? { privacyAcceptedAt: new Date() } : {}),
    })
    .where(eq(profiles.id, user.id));

  revalidatePath("/", "layout");
  return { ok: true };
}
