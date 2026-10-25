import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage() {
  // El enlace del email inicia una sesión temporal antes de llegar aquí.
  const user = await getSessionUser();
  if (!user) redirect("/login?error=enlace");
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Crea una nueva contraseña</h1>
        <p className="text-muted-foreground">Para la cuenta {user.email}</p>
      </div>
      <ResetPasswordForm redirectTo={user.profile.role === "admin" ? "/admin" : "/turnos"} />
    </div>
  );
}
