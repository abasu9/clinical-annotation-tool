import React, { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, Dataset } from "../lib/supabase";
import {
  DatasetProgress,
  deleteDataset,
  fetchDatasetProgress,
  fetchDatasets,
  fetchExportRows,
} from "../lib/data";
import { importDatasetFile } from "../lib/importDataset";
import { downloadFile, toCSV } from "../lib/csv";
import { toJSONL } from "../lib/jsonl";
import AnnotationsViewer from "./AnnotationsViewer";
import DashboardStatCards from "./DashboardStatCards";
import { ANNOTATION_GUIDELINES_URL } from "../lib/guidelines";
import { adminCard, btnPrimary, inputClass } from "../lib/ui";

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export default function AdminPanel({ onBack, backLabel = "Back" }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [progress, setProgress] = useState<Record<string, DatasetProgress>>({});
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Dataset | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await fetchDatasets();
      setDatasets(rows);
      const map: Record<string, DatasetProgress> = {};
      await Promise.all(
        rows.map(async (d) => {
          try {
            map[d.id] = await fetchDatasetProgress(d.id, d.total_samples);
          } catch (e) {
            /* show row even if progress fetch fails */
          }
        })
      );
      setProgress(map);
    } catch (e: any) {
      setError(e.message ?? "Failed to load datasets.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    return {
      datasets: datasets.length,
      totalSamples,
      submitted,
      remaining,
    };
  }, [datasets, progress]);

  const handleImport = async () => {
    if (!name.trim() && !file) {
      setError("Enter a dataset name and choose a .csv or .jsonl file.");
      return;
    }
    if (!name.trim()) {
      setError("Enter a dataset name (e.g. Clinical QA 100).");
      return;
    }
    if (!file) {
      setError("Choose a file — use Dataset/data_sample_100.prepared.jsonl or Browse to select it.");
      return;
    }
    setImporting(true);
    setError("");
    setMessage("");
    setImportStatus("Parsing file…");
    try {
      const res = await importDatasetFile({
        name,
        file,
        onProgress: (inserted, total) =>
          setImportStatus(`Inserting ${inserted} / ${total}…`),
      });
      setMessage(`Imported ${res.inserted} samples into dataset.`);
      setImportStatus("");
      setName("");
      setFile(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Import failed.");
      setImportStatus("");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDataset(id);
      setConfirmDelete(null);
      setMessage("Dataset deleted.");
      await load();
    } catch (e: any) {
      setError(e.message ?? "Delete failed.");
    }
  };

  const exportAs = async (id: string, name: string, format: "csv" | "jsonl") => {
    setError("");
    try {
      const rows = await fetchExportRows(id);
      if (rows.length === 0) {
        setMessage("No annotations to export yet.");
        return;
      }
      const slug = name.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "dataset";
      if (format === "csv") {
        const flat = rows.map((r) => ({
          ...r,
          image_urls: (r.image_urls ?? []).join(";"),
        }));
        downloadFile(`${slug}_annotations.csv`, toCSV(flat), "text/csv");
      } else {
        downloadFile(
          `${slug}_annotations.jsonl`,
          toJSONL(rows as unknown as Record<string, unknown>[]),
          "application/x-ndjson"
        );
      }
    } catch (e: any) {
      setError(e.message ?? "Export failed.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
          <p className="text-sm text-slate-500 mt-1">
            Import datasets, export annotations, manage storage
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition"
        >
          ← {backLabel}
        </button>
      </div>

      <DashboardStatCards
        className="mb-6"
        stats={[
          { label: "Total datasets", value: summary.datasets },
          { label: "Total samples", value: summary.totalSamples },
          { label: "Submitted", value: summary.submitted, tone: "emerald" },
          { label: "Remaining", value: summary.remaining, tone: "indigo" },
        ]}
      />

      {!isSupabaseConfigured && (
        <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> and restart the
          dev server.
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm text-slate-700 ring-1 ring-sky-100/80">
        <span className="shrink-0 text-sky-600" aria-hidden>
          ℹ
        </span>
        <p>
          Images are loaded from public or signed Cloudflare R2 URLs. Dataset files
          should contain <code className="rounded bg-white/80 px-1 text-xs">image_urls</code> or{" "}
          <code className="rounded bg-white/80 px-1 text-xs">image_paths</code>.
        </p>
      </div>

      <div className={`${adminCard} mb-6`}>
        <h3 className="text-lg font-semibold text-slate-800">
          Import dataset (.csv or .jsonl)
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4">
          <div className="flex min-w-0 flex-col">
            <label
              htmlFor="admin-dataset-name"
              className="text-sm font-medium leading-5 text-slate-600"
            >
              Dataset name
            </label>
            <input
              id="admin-dataset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clinical QA Batch 1"
              className={`${inputClass} mt-1.5 box-border h-11 py-0`}
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium leading-5 text-slate-600">File upload</span>
            <div className="mt-1.5 box-border flex h-11 w-full items-center gap-2 rounded-xl border border-indigo-200/80 bg-white px-3 shadow-sm">
              <label
                htmlFor="admin-import-file"
                className="shrink-0 cursor-pointer rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold leading-none text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-100"
              >
                Choose file
              </label>
              <span
                className={`min-w-0 flex-1 truncate text-sm leading-none ${
                  file ? "font-medium text-slate-800" : "text-slate-500"
                }`}
              >
                {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "No file chosen"}
              </span>
              <input
                id="admin-import-file"
                type="file"
                accept=".csv,.jsonl,.ndjson,text/csv,application/json,text/plain"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError("");
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600 sm:mt-4">
          <p className="font-semibold text-slate-700">Required format:</p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-600">
            post_id, question, image_urls/image_paths
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 items-center gap-2 sm:grid-cols-2 sm:gap-x-4">
          <div className="min-w-0">
            {importStatus ? (
              <p className="text-sm text-slate-500">{importStatus}</p>
            ) : null}
          </div>
          <div className="flex justify-stretch sm:justify-end">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !isSupabaseConfigured || !name.trim() || !file}
              className={`${btnPrimary} w-full sm:w-auto sm:min-w-[8.5rem] disabled:opacity-50`}
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>

      <div className={adminCard}>
        <h3 className="text-lg font-semibold mb-3 text-slate-800">Datasets</h3>
        {datasets.length === 0 ? (
          <p className="text-slate-500 text-sm">No datasets imported yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Submitted</th>
                  <th className="py-2 pr-3">Draft</th>
                  <th className="py-2 pr-3">Skipped</th>
                  <th className="py-2 pr-3">Remaining</th>
                  <th className="py-2 pr-3">View / Download</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => {
                  const p = progress[d.id];
                  return (
                    <tr key={d.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium">{d.name}</td>
                      <td className="py-2 pr-3 text-slate-500">
                        {d.uploaded_filename ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{d.total_samples}</td>
                      <td className="py-2 pr-3 text-emerald-700">
                        {p?.submitted ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-amber-700">
                        {p?.draft ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-orange-700">
                        {p?.skipped ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{p?.remaining ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => setViewing(d)}
                            className="text-indigo-700 font-medium hover:underline"
                          >
                            View
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            onClick={() => exportAs(d.id, d.name, "csv")}
                            className="text-indigo-600 hover:underline"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => exportAs(d.id, d.name, "jsonl")}
                            className="text-indigo-600 hover:underline"
                          >
                            JSONL
                          </button>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {confirmDelete === d.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(d.id)}
                              className="text-red-600 font-medium hover:underline"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-slate-500 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(d.id)}
                            className="text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <AnnotationsViewer
          datasetId={viewing.id}
          datasetName={viewing.name}
          totalSamples={viewing.total_samples}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
