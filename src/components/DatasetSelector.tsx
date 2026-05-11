import React, { useEffect, useState } from "react";
import { Dataset } from "../lib/supabase";
import { fetchDatasets } from "../lib/data";

interface Props {
  onSelect: (dataset: Dataset) => void;
}

export default function DatasetSelector({ onSelect }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDatasets()
      .then((rows) => {
        if (!cancelled) setDatasets(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load datasets.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Loading datasets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-slate-600 mb-2">No datasets available.</p>
        <p className="text-slate-400 text-sm">
          Ask your admin to import a dataset in the Admin Panel.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Select dataset</h2>
      <div className="space-y-3">
        {datasets.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="w-full text-left bg-white rounded-lg shadow hover:shadow-md border border-slate-200 hover:border-indigo-300 p-4 transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">{d.name}</p>
                <p className="text-sm text-slate-500">
                  {d.total_samples} samples
                  {d.uploaded_filename ? ` · ${d.uploaded_filename}` : ""}
                </p>
              </div>
              <span className="text-indigo-600 text-sm font-medium">Open →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
