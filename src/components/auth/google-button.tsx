import { signInWithGoogleAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function GoogleButton({ next }: { next?: string }) {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") return null;
  return (
    <>
      <form action={signInWithGoogleAction.bind(null, next)}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z" />
          </svg>
          Continuar con Google
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> o con tu email <div className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
