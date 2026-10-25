import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ProfileForm } from "@/components/auth/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePatient } from "@/lib/auth";
import { profileDefaults } from "@/lib/profile-defaults";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requirePatient("/perfil");
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Mi perfil</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Mantén tu teléfono actualizado para que podamos contactarte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaults={profileDefaults(user.profile)} needsPrivacy={!user.profile.privacyAcceptedAt} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-medium">Contraseña</div>
            <p className="text-sm text-muted-foreground">Te enviaremos un enlace para cambiarla.</p>
          </div>
          <Button asChild variant="outline"><Link href="/recuperar"><KeyRound /> Cambiar contraseña</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
