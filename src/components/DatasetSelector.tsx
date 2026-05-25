import React, { useEffect, useMemo, useState } from "react";
import { Dataset } from "../lib/supabase";
import { DatasetProgress, fetchDatasetProgress, fetchDatasets } from "../lib/data";
import DashboardStatCards from "./DashboardStatCards";

interface Props {
  annotatorId: string;
  onSelect: (dataset: Dataset) => void;
}

export default function DatasetSelector({ annotatorId, onSelect }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [progress, setProgress] = useState<Record<string, DatasetProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchDatasets();
        if (cancelled) return;
        setDatasets(rows);
        const map: Record<string, DatasetProgress> = {};
        await Promise.all(
          rows.map(async (d) => {
            try {
              map[d.id] = await fetchDatasetProgress(
                d.id,
                d.total_samples,
                annotatorId
              );
            } catch {
              /* show row without progress */
            }
          })
        );
        if (!cancelled) setProgress(map);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load datasets.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [annotatorId]);

  const summary = useMemo(() => {
    let submitted = 0;
    let remaining = 0;
    const totalSamples = datasets.reduce((sum, d) => sum + d.total_samples, 0);
    for (const d of datasets) {
      const p = progress[d.id];
      if (p) {
        submitted += p.submitted;
        remaining += p.remaining;
      } else {
        remaining += d.total_samples;
      }
    }
    return { datasets: datasets.length, totalSamples, submitted, remaining };
  }, [datasets, progress]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[4.25rem] animate-pulse rounded-xl border border-indigo-100 bg-white/80"
            />
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-slate-500 text-sm">Loading datasets…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <DashboardStatCards
          className="mb-8"
          stats={[
            { label: "Available datasets", value: 0 },
            { label: "Total samples", value: 0 },
            { label: "Your submitted", value: 0, tone: "emerald" },
            { label: "Your remaining", value: 0, tone: "indigo" },
          ]}
        />
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white/80">
          <p className="text-slate-700 font-medium mb-1">No datasets available</p>
          <p className="text-slate-500 text-sm">
            Ask your admin to import a dataset in the Admin Panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 pb-16 sm:px-6">
      <DashboardStatCards
        className="mb-8"
        stats={[
          { label: "Available datasets", value: summary.datasets },
          { label: "Total samples", value: summary.totalSamples },
          { label: "Your submitted", value: summary.submitted, tone: "emerald" },
          { label: "Your remaining", value: summary.remaining, tone: "indigo" },
        ]}
      />

      <div className="mb-8 rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-600/90 via-indigo-500/85 to-teal-600/75 p-6 shadow-lg shadow-indigo-500/25 text-white">
        <h2 className="text-2xl font-bold">Choose a dataset</h2>
        <p className="text-indigo-100 text-sm mt-1">
          Pick the collection you want to annotate today
        </p>
      </div>
      <div className="space-y-3">
        {datasets.map((d, i) => {
          const p = progress[d.id];
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              className="group w-full text-left rounded-xl border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/50 to-teal-50/40 p-5 shadow-md transition hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${
                    i % 3 === 0
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                      : i % 3 === 1
                        ? "bg-gradient-to-br from-teal-500 to-teal-700"
                        : "bg-gradient-to-br from-violet-500 to-violet-700"
                  }`}
                >
                  {d.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 group-hover:text-indigo-700 transition">
                    {d.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    <span className="font-medium text-slate-600">{d.total_samples}</span> samples
                    {p ? (
                      <span className="text-slate-400">
                        {" "}
                        · {p.remaining} remaining for you
                      </span>
                    ) : null}
                    {d.uploaded_filename ? (
                      <span className="text-slate-400"> · {d.uploaded_filename}</span>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                  Open
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
