import {
  Activity,
  Baby,
  Drill,
  Gem,
  HeartPulse,
  ShieldPlus,
  Siren,
  Smile,
  SmilePlus,
  Sparkles,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SERVICE_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  smile: Smile,
  "smile-plus": SmilePlus,
  gem: Gem,
  syringe: Syringe,
  activity: Activity,
  "shield-plus": ShieldPlus,
  drill: Drill,
  baby: Baby,
  siren: Siren,
  "heart-pulse": HeartPulse,
};

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

/** Ícono del servicio sobre un fondo suave de su color. */
export function ServiceIcon({
  icon,
  color,
  className,
  size = "md",
}: {
  icon: string;
  color: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = SERVICE_ICONS[icon] ?? Sparkles;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-11 [&_svg]:size-5",
        size === "lg" && "size-14 rounded-2xl [&_svg]:size-7",
        className,
      )}
      style={{
        color,
        background: `linear-gradient(135deg, ${color}26, ${color}0d)`,
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      <Icon />
    </span>
  );
}
