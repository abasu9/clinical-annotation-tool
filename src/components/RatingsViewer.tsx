import React, { useEffect, useMemo, useState } from "react";
import { fetchRatingExportRows, RatingExportRow } from "../lib/data";
import { downloadRatingsPerAnnotator } from "../lib/exportRatings";
interface Props {
  onClose: () => void;
}

type StatusFilter = "all" | "submitted" | "draft";

export default function RatingsViewer({ onClose }: Props) {
  const [rows, setRows] = useState<RatingExportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [evaluator, setEvaluator] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchRatingExportRows();
        if (!cancelled) setRows(data);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load ratings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const evaluators = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.evaluator_id));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const counts = useMemo(() => {
    let submitted = 0;
    let draft = 0;
    for (const r of rows) {
      if (r.status === "submitted") submitted += 1;
      else if (r.status === "draft") draft += 1;
    }
    return { submitted, draft, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (evaluator !== "all" && r.evaluator_id !== evaluator) return false;
      if (!q) return true;
      return (
        r.post_id.toLowerCase().includes(q) ||
        r.evaluator_id.toLowerCase().includes(q) ||
        (r.evaluator_code ?? "").toLowerCase().includes(q) ||
        r.rated_annotator_id.toLowerCase().includes(q) ||
        (r.rated_annotator_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, status, evaluator, search]);

  const exportAs = async (format: "csv" | "jsonl") => {
    if (filtered.length === 0) return;
    // Always export full filtered set, split into one file per evaluator code
    await downloadRatingsPerAnnotator(filtered, format);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8">
      <div className="my-4 w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">IAA ratings</h3>
            <p className="mt-1 text-sm text-slate-500">
              {counts.total} total · {counts.submitted} submitted · {counts.draft}{" "}
              draft
              {filtered.length !== rows.length
                ? ` · showing ${filtered.length}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportAs("csv")}
              disabled={filtered.length === 0}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
              title="One CSV per evaluator"
            >
              CSV per annotator
            </button>
            <button
              type="button"
              onClick={() => exportAs("jsonl")}
              disabled={filtered.length === 0}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
              title="One JSONL per evaluator"
            >
              JSONL per annotator
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm text-slate-600">
            Status{" "}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Evaluator{" "}
            <select
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
              className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="all">All</option>
              {evaluators.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search post_id, code, id…"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
          />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading ratings…</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">
            No ratings yet. After annotators use Rating → Submit, rows appear
            here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-2">post_id</th>
                  <th className="py-2 pr-2">Evaluator</th>
                  <th className="py-2 pr-2">Rated</th>
                  <th className="py-2 pr-2">Desc C</th>
                  <th className="py-2 pr-2">Desc I</th>
                  <th className="py-2 pr-2">Sum Inf</th>
                  <th className="py-2 pr-2">Sum C</th>
                  <th className="py-2 pr-2">Sum Comb</th>
                  <th className="py-2 pr-2">Sum Flu</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={`${r.sample_id}__${r.evaluator_id}__${r.rated_annotator_id}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-2 pr-2 font-mono text-indigo-800">
                      {r.post_id}
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-mono font-semibold uppercase">
                        {r.evaluator_code ?? "—"}
                      </span>
                      <span className="ml-1 text-slate-400">
                        ({r.evaluator_id})
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-mono font-semibold uppercase">
                        {r.rated_annotator_code ?? "—"}
                      </span>
                      <span className="ml-1 text-slate-400">
                        ({r.rated_annotator_id})
                      </span>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.desc_completeness ?? "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.desc_independence ?? "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.sum_informativeness ?? "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.sum_completeness ?? "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.sum_combination ?? "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {r.sum_fluency ?? "—"}
                    </td>
                    <td className="py-2 pr-2 capitalize">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
