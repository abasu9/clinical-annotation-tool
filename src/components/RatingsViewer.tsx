import React, { useEffect, useMemo, useState } from "react";
import { fetchRatingExportRows, RatingExportRow } from "../lib/data";
import { downloadRatingsPerAnnotator } from "../lib/exportRatings";
import { formatError } from "../lib/errors";
import DashboardStatCards from "./DashboardStatCards";
import { adminCard, inputClass } from "../lib/ui";

interface Props {
  variant?: "modal" | "embedded";
  onClose?: () => void;
}

type StatusFilter = "all" | "submitted" | "draft";

export default function RatingsViewer({
  variant = "modal",
  onClose,
}: Props) {
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
          setError(formatError(e, "Failed to load ratings."));
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
    const map = new Map<string, string | null>();
    for (const r of rows) {
      if (!map.has(r.evaluator_id)) {
        map.set(r.evaluator_id, r.evaluator_code);
      }
    }
    return Array.from(map.entries())
      .map(([id, code]) => ({ id, code }))
      .sort((a, b) => (a.code ?? a.id).localeCompare(b.code ?? b.id));
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
    await downloadRatingsPerAnnotator(filtered, format);
  };

  const embedded = variant === "embedded";

  const content = (
    <div className={embedded ? "" : "my-4 w-full max-w-6xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"}>
      {!embedded ? (
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
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <DashboardStatCards
            className="mb-4"
            stats={[
              { label: "Total ratings", value: counts.total },
              { label: "Submitted", value: counts.submitted, tone: "emerald" },
              { label: "Draft", value: counts.draft, tone: "amber" },
              {
                label: "Showing",
                value: filtered.length,
                tone: filtered.length !== rows.length ? "indigo" : "default",
              },
            ]}
          />

          <div className={`${adminCard} mb-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-800">
                  Export ratings
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  One file per evaluator (
                  <span className="font-mono">iaa_ratings_nf</span>,{" "}
                  <span className="font-mono">_c</span>,{" "}
                  <span className="font-mono">_sz</span>,{" "}
                  <span className="font-mono">_s</span>,{" "}
                  <span className="font-mono">_w</span>).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportAs("csv")}
                  disabled={filtered.length === 0}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                >
                  CSV per annotator
                </button>
                <button
                  type="button"
                  onClick={() => exportAs("jsonl")}
                  disabled={filtered.length === 0}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100 disabled:opacity-40"
                >
                  JSONL per annotator
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className={`${embedded ? adminCard : ""} ${
          embedded ? "" : "mt-4"
        }`.trim()}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block font-medium">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className={inputClass}
            >
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label className="block text-sm text-slate-600">
            <span className="mb-1 block font-medium">Evaluator</span>
            <select
              value={evaluator}
              onChange={(e) => setEvaluator(e.target.value)}
              className={inputClass}
            >
              <option value="all">All evaluators</option>
              {evaluators.map(({ id, code }) => (
                <option key={id} value={id}>
                  {code ? `${code.toUpperCase()} (${id})` : id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-600 sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block font-medium">Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="post_id, code, annotator id…"
              className={inputClass}
            />
          </label>
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
          <>
            <div className="mt-4 hidden overflow-x-auto lg:block">
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

            <div className="mt-4 space-y-3 lg:hidden">
              {filtered.map((r) => (
                <div
                  key={`${r.sample_id}__${r.evaluator_id}__${r.rated_annotator_id}`}
                  className="rounded-xl border border-indigo-100 bg-white/80 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-sm font-semibold text-indigo-800">
                      {r.post_id}
                    </p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    <span className="font-semibold uppercase text-slate-800">
                      {r.evaluator_code ?? "?"}
                    </span>{" "}
                    rated{" "}
                    <span className="font-semibold uppercase text-slate-800">
                      {r.rated_annotator_code ?? "?"}
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Desc C / I</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {r.desc_completeness ?? "—"} / {r.desc_independence ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Sum Inf / C</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {r.sum_informativeness ?? "—"} / {r.sum_completeness ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-slate-500">Comb / Flu</p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {r.sum_combination ?? "—"} / {r.sum_fluency ?? "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8">
      {content}
    </div>
  );
}
