import React from "react";
import type { DatasetProgress } from "../lib/data";

interface Props {
  progress: DatasetProgress | undefined;
  className?: string;
  variant?: "inline" | "chips" | "compact";
}

const BREAKDOWN_ITEMS = [
  {
    key: "yes" as const,
    label: "Yes",
    dot: "bg-emerald-500",
    chip: "border-emerald-200/80 bg-emerald-50 ring-emerald-100/80",
    labelClass: "text-emerald-700",
    valueClass: "text-emerald-900",
  },
  {
    key: "no" as const,
    label: "No",
    dot: "bg-sky-500",
    chip: "border-sky-200/80 bg-sky-50 ring-sky-100/80",
    labelClass: "text-sky-700",
    valueClass: "text-sky-900",
  },
  {
    key: "draft" as const,
    label: "Drafted",
    dot: "bg-amber-500",
    chip: "border-amber-200/80 bg-amber-50 ring-amber-100/80",
    labelClass: "text-amber-700",
    valueClass: "text-amber-900",
  },
  {
    key: "skipped" as const,
    label: "Skipped",
    dot: "bg-orange-500",
    chip: "border-orange-200/80 bg-orange-50 ring-orange-100/80",
    labelClass: "text-orange-700",
    valueClass: "text-orange-900",
  },
  {
    key: "out_of_expertise" as const,
    label: "Out of expertise",
    dot: "bg-violet-500",
    chip: "border-violet-200/80 bg-violet-50 ring-violet-100/80",
    labelClass: "text-violet-700",
    valueClass: "text-violet-900",
  },
];

/** Yes / No / Drafted / Skipped counts for one dataset or totals. */
export default function AnnotationBreakdown({
  progress,
  className = "",
  variant = "inline",
}: Props) {
  if (!progress) return null;

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
        {BREAKDOWN_ITEMS.map((item) => (
          <span
            key={item.key}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ring-1 ${item.chip}`}
          >
            <span className={item.labelClass}>{item.label}</span>
            <span className={`tabular-nums ${item.valueClass}`}>
              {progress[item.key]}
            </span>
          </span>
        ))}
      </div>
    );
  }

  if (variant === "chips") {
    return (
      <div
        className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 ${className}`.trim()}
      >
        {BREAKDOWN_ITEMS.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl border px-3 py-2.5 text-center shadow-sm ring-1 ${item.chip}`}
          >
            <p
              className={`text-[10px] font-semibold uppercase tracking-wide ${item.labelClass}`}
            >
              {item.label}
            </p>
            <p
              className={`mt-0.5 text-2xl font-bold tabular-nums ${item.valueClass}`}
            >
              {progress[item.key]}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 ${className}`.trim()}
    >
      {BREAKDOWN_ITEMS.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
          <span className="font-medium text-slate-700">{progress[item.key]}</span>
          <span className="text-slate-500">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function sumAnnotationBreakdown(
  map: Record<string, DatasetProgress>
): Pick<
  DatasetProgress,
  "yes" | "no" | "draft" | "skipped" | "out_of_expertise"
> {
  let yes = 0;
  let no = 0;
  let draft = 0;
  let skipped = 0;
  let out_of_expertise = 0;
  for (const p of Object.values(map)) {
    yes += p.yes;
    no += p.no;
    draft += p.draft;
    skipped += p.skipped;
    out_of_expertise += p.out_of_expertise;
  }
  return { yes, no, draft, skipped, out_of_expertise };
}
