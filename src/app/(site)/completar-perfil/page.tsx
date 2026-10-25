import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { Card, CardContent } from "@/components/ui/card";
import { isProfileComplete, requireUser } from "@/lib/auth";
import { profileDefaults } from "@/lib/profile-defaults";

export const metadata: Metadata = { title: "Completa tu perfil" };

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await requireUser("/completar-perfil");
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/turnos/nuevo";
  if (user.profile.role === "admin") redirect("/admin");
  if (isProfileComplete(user.profile) && user.profile.privacyAcceptedAt) redirect(target);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Completa tus datos</h1>
        <p className="text-muted-foreground">Los necesitamos para identificarte como paciente y contactarte sobre tus turnos.</p>
      </div>
      <Card>
        <CardContent>
          <ProfileForm
            defaults={profileDefaults(user.profile)}
            needsPrivacy={!user.profile.privacyAcceptedAt}
            redirectTo={target}
            submitLabel="Continuar"
          />
        </CardContent>
      </Card>
    </div>
  );
}
