import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Ingresar" };

const ERRORS: Record<string, string> = {
  enlace: "El enlace no es válido o ya venció. Intenta de nuevo.",
  google: "No pudimos conectar con Google. Intenta de nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
        <p className="text-muted-foreground">Ingresa para solicitar o gestionar tus turnos.</p>
      </div>
      <GoogleButton next={next} />
      <LoginForm next={next} initialError={error ? ERRORS[error] : undefined} />
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
