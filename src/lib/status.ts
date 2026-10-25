import type { AppointmentStatus } from "@/db/schema";

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    className: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-slate-500/12 text-slate-600 dark:text-slate-300 border-slate-500/25",
    dot: "bg-slate-400",
  },
  completed: {
    label: "Atendido",
    className: "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
    dot: "bg-sky-500",
  },
  no_show: {
    label: "No asistió",
    className: "bg-orange-500/12 text-orange-700 dark:text-orange-300 border-orange-500/25",
    dot: "bg-orange-500",
  },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as AppointmentStatus[];
