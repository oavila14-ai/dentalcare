import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Enlaces de los emails de Supabase (confirmación de cuenta y recuperación). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/turnos";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/turnos";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const url = new URL(next, origin);
      if (type === "email" || type === "signup") url.searchParams.set("bienvenida", "1");
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.redirect(new URL("/login?error=enlace", origin));
}
