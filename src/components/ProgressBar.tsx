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
    <div className="bg-white border-b border-slate-200 px-6 py-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4 text-xs text-slate-600 flex-wrap">
        <span>Progress:</span>
        <div className="flex-1 min-w-[200px] bg-slate-200 rounded-full h-2.5 overflow-hidden">
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
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Submitted: {submitted}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Draft: {draft}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Skipped: {skipped}
          </span>
          <span>Remaining: {remaining}</span>
        </div>
      </div>
    </div>
  );
}
