import Link from "next/link";
import { cn } from "@/lib/utils";

export function ToothMark({ className }: { className?: string }) {
  // Degradado en CSS (no en <defs> del SVG) para evitar ids duplicados cuando hay varios logos en la página.
  return (
    <span aria-hidden className={cn("inline-flex items-center justify-center rounded-[31%] bg-brand-gradient", className)}>
      <svg viewBox="0 0 32 32" fill="none" className="size-full">
        <path
          d="M11.2 8.5c-2.4 0-4 1.9-4 4.6 0 2.2.8 3.6 1.5 5.4.6 1.6.7 3.6 1.2 5.2.3 1 .8 1.8 1.6 1.8 1.2 0 1.4-1.6 1.8-3.4.3-1.4.9-2.6 2.7-2.6s2.4 1.2 2.7 2.6c.4 1.8.6 3.4 1.8 3.4.8 0 1.3-.8 1.6-1.8.5-1.6.6-3.6 1.2-5.2.7-1.8 1.5-3.2 1.5-5.4 0-2.7-1.6-4.6-4-4.6-1.9 0-2.9 1-4.8 1s-2.9-1-4.8-1Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

export function Logo({ name, className, href = "/" }: { name: string; className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <ToothMark className="size-8 shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="truncate">{name}</span>
    </Link>
  );
}
