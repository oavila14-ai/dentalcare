import { cn } from "@/lib/utils";

/** Fondo "mesh gradient" animado: blobs difuminados de la paleta de marca. */
export function MeshBackground({ className, intensity = "normal" }: { className?: string; intensity?: "normal" | "soft" }) {
  const o = intensity === "soft" ? "opacity-40 dark:opacity-30" : "opacity-70 dark:opacity-50";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <div className={cn("absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-teal blur-[120px] animate-blob", o)} />
      <div
        className={cn("absolute top-10 -right-40 size-[30rem] rounded-full bg-brand-indigo blur-[120px] animate-blob", o)}
        style={{ animationDelay: "-6s" }}
      />
      <div
        className={cn("absolute -bottom-48 left-1/3 size-[28rem] rounded-full bg-brand-cyan blur-[130px] animate-blob", o)}
        style={{ animationDelay: "-12s" }}
      />
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
    </div>
  );
}
