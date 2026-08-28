import React from "react";
import type { DatasetProgress } from "../lib/data";

interface Props {
  progress: DatasetProgress | undefined;
  className?: string;
}

/** Yes / No / Drafted / Skipped counts for one dataset or totals. */
export default function AnnotationBreakdown({ progress, className = "" }: Props) {
  if (!progress) return null;
  const items = [
    { label: "Yes", value: progress.yes, dot: "bg-emerald-500" },
    { label: "No", value: progress.no, dot: "bg-sky-500" },
    { label: "Drafted", value: progress.draft, dot: "bg-amber-500" },
    { label: "Skipped", value: progress.skipped, dot: "bg-orange-500" },
  ];
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 ${className}`.trim()}
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${item.dot}`} />
          <span className="font-medium text-slate-700">{item.value}</span>
          <span className="text-slate-500">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export function sumAnnotationBreakdown(
  map: Record<string, DatasetProgress>
): Pick<DatasetProgress, "yes" | "no" | "draft" | "skipped"> {
  let yes = 0;
  let no = 0;
  let draft = 0;
  let skipped = 0;
  for (const p of Object.values(map)) {
    yes += p.yes;
    no += p.no;
    draft += p.draft;
    skipped += p.skipped;
  }
  return { yes, no, draft, skipped };
}
