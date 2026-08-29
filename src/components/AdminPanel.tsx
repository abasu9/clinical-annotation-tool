import React, { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, Dataset } from "../lib/supabase";
import {
  DatasetProgress,
  deleteDataset,
  fetchAnnotatorsAdmin,
  fetchDatasetProgress,
  fetchDatasets,
  fetchExportRows,
  updateDatasetAssignment,
} from "../lib/data";
import { importDatasetFile } from "../lib/importDataset";
import {
  labelForAnnotatorLogin,
  cleanDisplayName,
  type AnnotatorProfile,
  type AnnotatorAdminProfile,
} from "../lib/annotatorDatasets";
import { downloadFile, toCSV } from "../lib/csv";
import { toJSONL } from "../lib/jsonl";
import AnnotationsViewer from "./AnnotationsViewer";
import AnnotatorManager from "./AnnotatorManager";
import RatingsViewer from "./RatingsViewer";
import DashboardStatCards from "./DashboardStatCards";
import AnnotationBreakdown, {
  sumAnnotationBreakdown,
} from "./AnnotationBreakdown";
import { adminCard, btnPrimary, inputClass } from "../lib/ui";

interface Props {
  onBack: () => void;
  backLabel?: string;
}

type AdminTab = "overview" | "datasets" | "annotators" | "ratings";

const ADMIN_SECTIONS: {
  id: AdminTab;
  label: string;
  description: string;
}[] = [
  { id: "overview", label: "Overview", description: "Progress at a glance" },
  { id: "datasets", label: "Datasets", description: "Import and manage data" },
  { id: "annotators", label: "Annotators", description: "Accounts and PINs" },
  { id: "ratings", label: "Ratings", description: "IAA export and review" },
];

function datasetCompletionPct(
  p: DatasetProgress | undefined,
  total: number
): number {
  if (!p || total === 0) return 0;
  const done = p.submitted + p.skipped + p.out_of_expertise;
  return Math.round((done / total) * 100);
}

export default function AdminPanel({ onBack, backLabel = "Back" }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [annotators, setAnnotators] = useState<AnnotatorAdminProfile[]>([]);
  const [progress, setProgress] = useState<Record<string, DatasetProgress>>({});
  const [name, setName] = useState("");
  const [assignedAnnotatorId, setAssignedAnnotatorId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Dataset | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const load = useCallback(async () => {
    setError("");
    try {
      const [rows, annotatorRows] = await Promise.all([
        fetchDatasets(),
        fetchAnnotatorsAdmin(),
      ]);
      setAnnotators(annotatorRows);
      setAssignedAnnotatorId((prev) => prev || annotatorRows[0]?.login_id || "");
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
      setError("Enter a dataset name and choose a .csv, .json, or .jsonl file.");
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
    if (!assignedAnnotatorId) {
      setError("Choose which annotator this dataset is assigned to.");
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
        assignedAnnotatorId,
        onProgress: (inserted, total) =>
          setImportStatus(`Inserting ${inserted} / ${total}…`),
      });
      setMessage(`Imported ${res.inserted} samples into dataset.`);
      setImportStatus("");
      setName("");
      setAssignedAnnotatorId(annotators[0]?.login_id ?? "");
      setFile(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Import failed.");
      setImportStatus("");
    } finally {
      setImporting(false);
    }
  };

  const handleAssignmentChange = async (
    datasetId: string,
    nextAssignedAnnotatorId: string
  ) => {
    if (!nextAssignedAnnotatorId) return;
    setError("");
    try {
      const updated = await updateDatasetAssignment(
        datasetId,
        nextAssignedAnnotatorId
      );
      setDatasets((rows) =>
        rows.map((d) => (d.id === datasetId ? updated : d))
      );
      setMessage(`Assigned "${updated.name}" to ${labelForAnnotatorLogin(updated.assigned_annotator_id, annotators)}.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update assignment.");
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

  const breakdownTotals = useMemo(
    () => sumAnnotationBreakdown(progress),
    [progress]
  );

  const activeSection = ADMIN_SECTIONS.find((s) => s.id === activeTab);

  const renderNavButton = (section: (typeof ADMIN_SECTIONS)[number], compact = false) => {
    const selected = activeTab === section.id;
    return (
      <button
        key={section.id}
        type="button"
        onClick={() => setActiveTab(section.id)}
        className={
          compact
            ? `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "bg-white text-slate-600 ring-1 ring-indigo-200 hover:bg-indigo-50"
              }`
            : `w-full rounded-lg px-3 py-2.5 text-left transition ${
                selected
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
              }`
        }
      >
        <span className="block text-sm font-semibold">{section.label}</span>
        {!compact ? (
          <span
            className={`mt-0.5 block text-xs ${
              selected ? "text-indigo-100" : "text-slate-500"
            }`}
          >
            {section.description}
          </span>
        ) : null}
      </button>
    );
  };

  const renderDatasetActions = (d: Dataset) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setViewing(d)}
        className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
      >
        View
      </button>
      <button
        type="button"
        onClick={() => exportAs(d.id, d.name, "csv")}
        className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
      >
        CSV
      </button>
      <button
        type="button"
        onClick={() => exportAs(d.id, d.name, "jsonl")}
        className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
      >
        JSONL
      </button>
      {confirmDelete === d.id ? (
        <>
          <button
            type="button"
            onClick={() => handleDelete(d.id)}
            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
          >
            Confirm delete
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="text-xs font-medium text-slate-500 hover:underline"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(d.id)}
          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100"
        >
          Delete
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-indigo-200/70 lg:bg-white/75 lg:backdrop-blur-sm">
        <div className="border-b border-indigo-200/60 px-5 py-5">
          <h2 className="text-lg font-bold text-slate-900">Admin Panel</h2>
          <p className="mt-1 text-xs text-slate-500">
            Import, export, and manage annotators
          </p>
        </div>
        <nav className="flex-1 p-3" aria-label="Admin sections">
          <ul className="space-y-1">
            {ADMIN_SECTIONS.map((section) => (
              <li key={section.id}>{renderNavButton(section)}</li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-indigo-200/60 p-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition"
          >
            ← {backLabel}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-indigo-200/70 bg-white/90 px-4 py-3 lg:hidden">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Admin Panel</h2>
              <p className="text-xs text-slate-500">
                {activeSection?.description ?? "Manage the annotation tool"}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition"
            >
              ← {backLabel}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ADMIN_SECTIONS.map((section) => renderNavButton(section, true))}
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            <div className="mb-5 hidden lg:block">
              <h3 className="text-2xl font-bold text-slate-900">
                {activeSection?.label ?? "Admin"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {activeSection?.description}
              </p>
            </div>
          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code> and restart
              the dev server.
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

          {activeTab === "overview" && (
            <>
              <DashboardStatCards
                className="mb-3"
                stats={[
                  { label: "Total datasets", value: summary.datasets },
                  { label: "Total samples", value: summary.totalSamples },
                  { label: "Submitted", value: summary.submitted, tone: "emerald" },
                  { label: "Remaining", value: summary.remaining, tone: "indigo" },
                ]}
              />

              <div className={`${adminCard} mb-6 px-4 py-3`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  All datasets
                </p>
                <AnnotationBreakdown
                  progress={{
                    total_samples: summary.totalSamples,
                    submitted: summary.submitted,
                    draft: breakdownTotals.draft,
                    skipped: breakdownTotals.skipped,
                    out_of_expertise: breakdownTotals.out_of_expertise,
                    remaining: summary.remaining,
                    yes: breakdownTotals.yes,
                    no: breakdownTotals.no,
                  }}
                  className="mt-2"
                />
              </div>

              <div className={`${adminCard} mb-6`}>
                <h4 className="text-lg font-semibold text-slate-800">
                  Dataset progress
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  Completion across all imported datasets.
                </p>
                {datasets.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No datasets imported yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {datasets.map((d) => {
                      const p = progress[d.id];
                      const pct = datasetCompletionPct(p, d.total_samples);
                      return (
                        <li
                          key={d.id}
                          className="rounded-xl border border-indigo-100 bg-white/80 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {d.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {labelForAnnotatorLogin(
                                  d.assigned_annotator_id,
                                  annotators
                                )}{" "}
                                · {d.total_samples} samples
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-indigo-700">
                              {pct}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                            <div className="flex h-full">
                              {p && d.total_samples > 0 ? (
                                <>
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{
                                      width: `${(p.yes / d.total_samples) * 100}%`,
                                    }}
                                    title={`Yes: ${p.yes}`}
                                  />
                                  <div
                                    className="h-full bg-sky-500"
                                    style={{
                                      width: `${(p.no / d.total_samples) * 100}%`,
                                    }}
                                    title={`No: ${p.no}`}
                                  />
                                  <div
                                    className="h-full bg-amber-400"
                                    style={{
                                      width: `${(p.draft / d.total_samples) * 100}%`,
                                    }}
                                    title={`Drafted: ${p.draft}`}
                                  />
                                  <div
                                    className="h-full bg-orange-400"
                                    style={{
                                      width: `${(p.skipped / d.total_samples) * 100}%`,
                                    }}
                                    title={`Skipped: ${p.skipped}`}
                                  />
                                  <div
                                    className="h-full bg-violet-500"
                                    style={{
                                      width: `${
                                        (p.out_of_expertise / d.total_samples) * 100
                                      }%`,
                                    }}
                                    title={`Out of expertise: ${p.out_of_expertise}`}
                                  />
                                </>
                              ) : (
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              )}
                            </div>
                          </div>
                          <AnnotationBreakdown progress={p} className="mt-2" />
                          <p className="mt-1.5 text-xs text-slate-500">
                            Remaining {p?.remaining ?? d.total_samples} · Submitted{" "}
                            {p?.submitted ?? 0}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/90 px-4 py-3 text-sm text-slate-700 ring-1 ring-sky-100/80">
                <span className="shrink-0 text-sky-600" aria-hidden>
                  ℹ
                </span>
                <p>
                  Images are loaded from public or signed Cloudflare R2 URLs.
                  Dataset files should contain{" "}
                  <code className="rounded bg-white/80 px-1 text-xs">image_urls</code>{" "}
                  or{" "}
                  <code className="rounded bg-white/80 px-1 text-xs">image_paths</code>
                  .
                </p>
              </div>
            </>
          )}

          {activeTab === "annotators" && (
            <AnnotatorManager
                annotators={annotators}
                onCreated={(a) => {
                  setAnnotators((rows) =>
                    [...rows, a].sort((x, y) =>
                      x.display_name.localeCompare(y.display_name)
                    )
                  );
                  setAssignedAnnotatorId(a.login_id);
                  setMessage(
                    `Added ${cleanDisplayName(a.display_name)}. Share their login ID and PIN privately.`
                  );
              }}
            />
          )}

          {activeTab === "ratings" && <RatingsViewer variant="embedded" />}

          {activeTab === "datasets" && (
            <>
              <div className={`${adminCard} mb-6`}>
        <h3 className="text-lg font-semibold text-slate-800">
          Import dataset (.csv, .json, or .jsonl)
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
            <label
              htmlFor="admin-assigned-annotator"
              className="text-sm font-medium leading-5 text-slate-600"
            >
              Assign to annotator
            </label>
            <select
              id="admin-assigned-annotator"
              value={assignedAnnotatorId}
              onChange={(e) => setAssignedAnnotatorId(e.target.value)}
              disabled={annotators.length === 0}
              className={`${inputClass} mt-1.5 box-border h-11 py-0 disabled:opacity-50`}
            >
              {annotators.length === 0 ? (
                <option value="">Add an annotator first</option>
              ) : null}
              {annotators.map((a) => (
                <option key={a.id} value={a.login_id}>
                  {cleanDisplayName(a.display_name)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col sm:col-span-2">
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
                accept=".csv,.json,.jsonl,.ndjson,text/csv,application/json,text/plain"
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
              disabled={
                importing ||
                !isSupabaseConfigured ||
                !name.trim() ||
                !file ||
                !assignedAnnotatorId ||
                annotators.length === 0
              }
              className={`${btnPrimary} w-full sm:w-auto sm:min-w-[8.5rem] disabled:opacity-50`}
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>

      <div className={`${adminCard} mb-6`}>
        <h3 className="text-lg font-semibold mb-3 text-slate-800">Imported datasets</h3>
        {datasets.length === 0 ? (
          <p className="text-slate-500 text-sm">No datasets imported yet.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Assigned to</th>
                    <th className="py-2 pr-3">File</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Submitted</th>
                    <th className="py-2 pr-3">Draft</th>
                    <th className="py-2 pr-3">Skipped</th>
                    <th className="py-2 pr-3">Out of expertise</th>
                    <th className="py-2 pr-3">Remaining</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((d) => {
                    const p = progress[d.id];
                    return (
                      <tr key={d.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium">{d.name}</td>
                        <td className="py-2 pr-3">
                          <select
                            value={d.assigned_annotator_id ?? ""}
                            onChange={(e) =>
                              handleAssignmentChange(d.id, e.target.value)
                            }
                            className={`${inputClass} min-w-[11rem] py-1.5 text-xs`}
                            aria-label={`Assign ${d.name}`}
                          >
                            {!d.assigned_annotator_id ? (
                              <option value="" disabled>
                                Unassigned (name match)
                              </option>
                            ) : null}
                            {annotators.map((a) => (
                              <option key={a.id} value={a.login_id}>
                                {cleanDisplayName(a.display_name)}
                              </option>
                            ))}
                          </select>
                        </td>
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
                        <td className="py-2 pr-3 text-violet-700">
                          {p?.out_of_expertise ?? "—"}
                        </td>
                        <td className="py-2 pr-3">{p?.remaining ?? "—"}</td>
                        <td className="py-2 pr-3">{renderDatasetActions(d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 lg:hidden">
              {datasets.map((d) => {
                const p = progress[d.id];
                const pct = datasetCompletionPct(p, d.total_samples);
                return (
                  <div
                    key={d.id}
                    className="rounded-xl border border-indigo-100 bg-white/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{d.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {d.uploaded_filename ?? "No file name"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-indigo-700">
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <label className="text-xs font-medium text-slate-600">
                        Assigned to
                      </label>
                      <select
                        value={d.assigned_annotator_id ?? ""}
                        onChange={(e) =>
                          handleAssignmentChange(d.id, e.target.value)
                        }
                        className={`${inputClass} mt-1 py-2 text-sm`}
                        aria-label={`Assign ${d.name}`}
                      >
                        {!d.assigned_annotator_id ? (
                          <option value="" disabled>
                            Unassigned (name match)
                          </option>
                        ) : null}
                        {annotators.map((a) => (
                          <option key={a.id} value={a.login_id}>
                            {cleanDisplayName(a.display_name)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                        <p className="text-slate-500">Total</p>
                        <p className="font-semibold text-slate-900">
                          {d.total_samples}
                        </p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
                        <p className="text-emerald-700">Submitted</p>
                        <p className="font-semibold text-emerald-800">
                          {p?.submitted ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                        <p className="text-amber-700">Draft</p>
                        <p className="font-semibold text-amber-800">
                          {p?.draft ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-indigo-50 px-2 py-1.5">
                        <p className="text-indigo-700">Remaining</p>
                        <p className="font-semibold text-indigo-900">
                          {p?.remaining ?? d.total_samples}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">{renderDatasetActions(d)}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
            </>
          )}
          </div>
        </main>
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
