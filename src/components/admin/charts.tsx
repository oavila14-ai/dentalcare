"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Un solo color de serie (validado para modo claro y oscuro). Los textos usan tokens de texto.
const SERIES = "#0d9488";
const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-sm shadow-soft">
      <div className="text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2 font-medium">
        <span className="size-2 rounded-full" style={{ background: SERIES }} />
        {payload[0].value} {unit}
      </div>
    </div>
  );
}

export function DailyColumns({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} interval="preserveStartEnd" minTickGap={8} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip unit="turnos" />} />
          <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServiceBars({ data }: { data: { label: string; value: number }[] }) {
  const height = Math.max(160, data.length * 34 + 24);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS} />
          <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ ...AXIS, fill: "var(--foreground)" }} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip unit="turnos" />} />
          <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: "right", fontSize: 12, fill: "var(--muted-foreground)" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vista de tabla accesible para los datos de un gráfico. */
export function ChartTable({ data, header }: { data: { label: string; value: number }[]; header: [string, string] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver datos en tabla</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground"><th className="py-1 font-medium">{header[0]}</th><th className="py-1 text-right font-medium">{header[1]}</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-t border-border/60"><td className="py-1.5">{d.label}</td><td className="py-1.5 text-right tabular-nums">{d.value}</td></tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
