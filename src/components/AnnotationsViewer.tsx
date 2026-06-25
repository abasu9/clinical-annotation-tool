import React, { useEffect, useMemo, useState } from "react";
import AnnotationStatusPill from "./AnnotationStatusPill";
import { ExportRow, fetchExportRows } from "../lib/data";
import { downloadFile, toCSV } from "../lib/csv";
import { toJSONL } from "../lib/jsonl";

interface Props {
  datasetId: string;
  datasetName: string;
  totalSamples: number;
  onClose: () => void;
}

type StatusFilter = "all" | "submitted" | "draft" | "skipped" | "out_of_expertise";

const slugify = (s: string) =>
  s.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "dataset";

export default function AnnotationsViewer({
  datasetId,
  datasetName,
  totalSamples,
  onClose,
}: Props) {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [annotator, setAnnotator] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchExportRows(datasetId);
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load annotations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const annotators = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.annotator_id));
    return Array.from(s).sort();
  }, [rows]);

  const counts = useMemo(() => {
    const c = { submitted: 0, draft: 0, skipped: 0, out_of_expertise: 0 };
    rows.forEach((r) => {
      if (r.status === "submitted") c.submitted += 1;
      else if (r.status === "draft") c.draft += 1;
      else if (r.status === "skipped") c.skipped += 1;
      else if (r.status === "out_of_expertise") c.out_of_expertise += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (annotator !== "all" && r.annotator_id !== annotator) return false;
      if (!q) return true;
      return (
        r.post_id.toLowerCase().includes(q) ||
        r.original_question.toLowerCase().includes(q) ||
        (r.objective_image_description ?? "").toLowerCase().includes(q) ||
        (r.final_multimodal_clinical_summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, status, annotator, search]);

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allExpanded =
    filtered.length > 0 && filtered.every((r) => expanded.has(`${r.post_id}__${r.annotator_id}`));

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      const next = new Set<string>();
      filtered.forEach((r) => next.add(`${r.post_id}__${r.annotator_id}`));
      setExpanded(next);
    }
  };

  const downloadFiltered = (fmt: "csv" | "jsonl") => {
    if (filtered.length === 0) return;
    const slug = slugify(datasetName);
    const tag =
      status === "all" && annotator === "all" && !search ? "all" : "filtered";
    if (fmt === "csv") {
      const flat = filtered.map((r) => ({
        ...r,
        image_urls: (r.image_urls ?? []).join(";"),
      }));
      downloadFile(`${slug}_annotations_${tag}.csv`, toCSV(flat), "text/csv");
    } else {
      downloadFile(
        `${slug}_annotations_${tag}.jsonl`,
        toJSONL(filtered as unknown as Record<string, unknown>[]),
        "application/x-ndjson"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-stretch justify-center p-2 sm:p-6">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col overflow-hidden border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Annotations · {datasetName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading
                ? "Loading…"
                : `${rows.length} annotation row(s) across ${totalSamples} samples · ` +
                  `submitted ${counts.submitted} · draft ${counts.draft} · skipped ${counts.skipped} · out of expertise ${counts.out_of_expertise}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadFiltered("csv")}
              disabled={loading || filtered.length === 0}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
              title="Download what's currently visible"
            >
              Download CSV
            </button>
            <button
              onClick={() => downloadFiltered("jsonl")}
              disabled={loading || filtered.length === 0}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
              title="Download what's currently visible"
            >
              Download JSONL
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded hover:bg-slate-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap gap-3 items-end bg-white">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="all">All ({rows.length})</option>
              <option value="submitted">Submitted ({counts.submitted})</option>
              <option value="draft">Draft ({counts.draft})</option>
              <option value="skipped">Skipped ({counts.skipped})</option>
              <option value="out_of_expertise">
                Not within expertise ({counts.out_of_expertise})
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Annotator</label>
            <select
              value={annotator}
              onChange={(e) => setAnnotator(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="all">All ({annotators.length})</option>
              {annotators.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">
              Search (post_id / question / annotation text)
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="type to filter…"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleAll}
              disabled={filtered.length === 0}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40"
              title="Toggle full text for every visible row"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
            <div className="text-xs text-slate-500">
              Showing <span className="font-medium">{filtered.length}</span> of{" "}
              {rows.length}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading annotations…</p>
          ) : error ? (
            <div className="p-4 m-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">
              {rows.length === 0
                ? "No annotations have been saved for this dataset yet."
                : "No rows match the current filters."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-slate-600 border-b border-slate-200">
                  <th className="py-2 px-3">post_id</th>
                  <th className="py-2 px-3">Annotator</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Requires summarization</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Question</th>
                  <th className="py-2 px-3">Objective description</th>
                  <th className="py-2 px-3">Final summary</th>
                  <th className="py-2 px-3">Updated</th>
                  <th className="py-2 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const rowKey = `${r.post_id}__${r.annotator_id}`;
                  const isOpen = expanded.has(rowKey);
                  return (
                    <React.Fragment key={rowKey}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 align-top font-mono text-xs">
                          {r.post_id}
                        </td>
                        <td className="py-2 px-3 align-top">{r.annotator_id}</td>
                        <td className="py-2 px-3 align-top">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="py-2 px-3 align-top text-xs">
                          {r.image_status || "—"}
                        </td>
                        <td className="py-2 px-3 align-top text-xs max-w-[200px]">
                          <Truncated text={r.summarization_reason} />
                        </td>
                        <td className="py-2 px-3 align-top text-xs max-w-[280px]">
                          <Truncated text={r.original_question} />
                        </td>
                        <td className="py-2 px-3 align-top text-xs max-w-[260px]">
                          <Truncated text={r.objective_image_description} />
                        </td>
                        <td className="py-2 px-3 align-top text-xs max-w-[260px]">
                          <Truncated text={r.final_multimodal_clinical_summary} />
                        </td>
                        <td className="py-2 px-3 align-top text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(r.updated_at)}
                        </td>
                        <td className="py-2 px-3 align-top text-right">
                          <button
                            onClick={() => toggleRow(rowKey)}
                            className="text-xs px-2 py-1 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            title={isOpen ? "Hide full text" : "Show full text"}
                          >
                            {isOpen ? "Hide" : "Show full"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-indigo-50/40 border-b border-slate-200">
                          <td colSpan={10} className="py-4 px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <Field
                                label="Requires summarization"
                                value={r.image_status}
                              />
                              <Field
                                label="Reason"
                                value={r.summarization_reason ?? ""}
                              />
                              <Field
                                label="Original question"
                                value={r.original_question}
                              />
                              <Field
                                label="Image URLs"
                                value={
                                  r.image_urls && r.image_urls.length
                                    ? r.image_urls.join("\n")
                                    : "(none)"
                                }
                              />
                              <Field
                                label="Objective image description"
                                value={r.objective_image_description ?? ""}
                              />
                              <Field
                                label="Final multimodal clinical summary"
                                value={r.final_multimodal_clinical_summary ?? ""}
                              />
                              <div className="md:col-span-2 text-slate-500">
                                Created {formatDate(r.created_at)} · Updated{" "}
                                {formatDate(r.updated_at)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <AnnotationStatusPill status={status || "unstarted"} />;
}

function Truncated({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-slate-400">—</span>;
  const oneLine = text.replace(/\s+/g, " ").trim();
  const short = oneLine.length > 140 ? oneLine.slice(0, 140) + "…" : oneLine;
  return <span title={oneLine}>{short}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="whitespace-pre-wrap break-words bg-white border border-slate-200 rounded p-2 text-slate-800 max-h-60 overflow-auto">
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}
