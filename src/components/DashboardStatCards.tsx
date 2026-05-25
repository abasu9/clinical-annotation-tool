import React from "react";

export type StatTone = "default" | "emerald" | "indigo" | "amber";

export interface DashboardStat {
  label: string;
  value: number | string;
  tone?: StatTone;
}

const TONE_STYLES: Record<StatTone, { box: string; label: string; value: string }> = {
  default: {
    box: "border-indigo-200/70 bg-white/95 ring-indigo-100/60",
    label: "text-slate-500",
    value: "text-slate-900",
  },
  emerald: {
    box: "border-emerald-200/70 bg-emerald-50/40 ring-emerald-100/60",
    label: "text-emerald-800/80",
    value: "text-emerald-800",
  },
  indigo: {
    box: "border-indigo-200/70 bg-indigo-50/50 ring-indigo-100/60",
    label: "text-indigo-800/80",
    value: "text-indigo-900",
  },
  amber: {
    box: "border-amber-200/70 bg-amber-50/40 ring-amber-100/60",
    label: "text-amber-800/80",
    value: "text-amber-800",
  },
};

interface Props {
  stats: DashboardStat[];
  className?: string;
}

export default function DashboardStatCards({ stats, className = "" }: Props) {
  const cols =
    stats.length <= 2
      ? "grid-cols-2"
      : stats.length === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={`grid gap-3 ${cols} ${className}`.trim()}>
      {stats.map((stat) => {
        const tone = TONE_STYLES[stat.tone ?? "default"];
        return (
          <div
            key={stat.label}
            className={`rounded-xl border px-4 py-3 shadow-sm ring-1 ${tone.box}`}
          >
            <p className={`text-xs font-medium ${tone.label}`}>{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${tone.value}`}>
              {stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
