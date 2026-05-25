import React from "react";
import type { DatasetProgress } from "../lib/data";

interface Props {
  progress: DatasetProgress | null;
}

export default function ProgressBar({ progress }: Props) {
  if (!progress || progress.total_samples === 0) return null;
  const { total_samples, submitted, draft, skipped, remaining } = progress;
  const pct = (n: number) => `${(Math.min(1, n / total_samples) * 100).toFixed(0)}%`;
  return (
    <div className="border-b border-indigo-200 bg-indigo-100 px-4 sm:px-6 py-2.5">
      <div className="max-w-[1800px] mx-auto flex items-center gap-4 text-xs text-slate-800 flex-wrap">
        <span className="font-semibold text-slate-900">Your progress</span>
        <div className="flex-1 min-w-[200px] bg-white rounded-full h-3 overflow-hidden ring-1 ring-indigo-200 shadow-inner">
          <div className="h-full flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: pct(submitted) }}
            />
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: pct(draft) }}
            />
            <div
              className="bg-orange-400 h-full transition-all"
              style={{ width: pct(skipped) }}
            />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-indigo-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Submitted {submitted}
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-indigo-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Draft {draft}
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-indigo-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Skipped {skipped}
          </span>
          <span className="rounded-md bg-indigo-700 px-2 py-0.5 font-semibold text-white shadow-sm">
            Remaining {remaining}
          </span>
        </div>
      </div>
    </div>
  );
}
