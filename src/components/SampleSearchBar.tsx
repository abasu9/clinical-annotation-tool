import React from "react";
import AnnotationStatusPill from "./AnnotationStatusPill";

export interface SampleSearchHit {
  index: number;
  post_id: string;
  questionPreview: string;
  statusLabel: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  hits: SampleSearchHit[];
  onSelectHit: (index: number) => void;
  onCloseResults: () => void;
  disabled?: boolean;
  /** Renders inline in a toolbar row (e.g. beside Change dataset). */
  embedded?: boolean;
}

function previewQuestion(text: string, max = 100): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export { previewQuestion };

export default function SampleSearchBar({
  value,
  onChange,
  onSearch,
  hits,
  onSelectHit,
  onCloseResults,
  disabled,
  embedded = false,
}: Props) {
  const showResults = hits.length > 0;

  const shellClass = embedded
    ? "relative min-w-0 flex-1 max-w-xl"
    : "relative border-b border-indigo-300/90 bg-indigo-200/95 px-4 py-2.5 sm:px-6";

  const rowClass = embedded
    ? "flex min-w-0 flex-1 items-center gap-2"
    : "mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3";

  const labelClass = embedded
    ? "shrink-0 text-xs font-semibold text-slate-700"
    : "shrink-0 text-sm font-semibold text-indigo-950";

  const inputClass = embedded
    ? "min-w-0 flex-1 rounded-lg border border-indigo-200/90 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
    : "min-w-0 flex-1 rounded-lg border border-indigo-300/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 disabled:opacity-60";

  const searchBtnClass = embedded
    ? "shrink-0 rounded-lg border border-indigo-300/80 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
    : "shrink-0 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:opacity-50 transition";

  const resultsClass = embedded
    ? "absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-indigo-300/80 bg-white text-left shadow-lg shadow-indigo-300/30"
    : "mx-auto mt-2 max-w-4xl overflow-hidden rounded-lg border border-indigo-300/80 bg-white text-left shadow-md shadow-indigo-300/25";

  return (
    <div className={shellClass}>
      <div className={rowClass}>
        <label htmlFor="sample-search" className={labelClass}>
          Find sample
        </label>
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            id="sample-search"
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
              if (e.key === "Escape") onCloseResults();
            }}
            disabled={disabled}
            placeholder="post_id or words in the question…"
            className={inputClass}
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={disabled || !value.trim()}
            className={searchBtnClass}
          >
            Search
          </button>
          {showResults && (
            <button
              type="button"
              onClick={onCloseResults}
              className="shrink-0 rounded-lg border border-indigo-400/60 bg-white/80 px-3 py-2 text-sm font-medium text-indigo-900 hover:bg-white transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className={resultsClass}>
          <div className="border-b border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs text-slate-600">
            {hits.length} result{hits.length === 1 ? "" : "s"} — click a row to open
          </div>
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {hits.map((hit) => (
              <li key={`${hit.post_id}-${hit.index}`}>
                <button
                  type="button"
                  onClick={() => onSelectHit(hit.index)}
                  className="w-full px-3 py-2 text-left transition hover:bg-indigo-50/80 focus:bg-indigo-50/80 focus:outline-none"
                >
                  <span className="font-mono text-sm font-semibold text-indigo-800">
                    {hit.post_id}
                  </span>
                  <span className="ml-2 inline-flex align-middle">
                    <AnnotationStatusPill status={hit.statusLabel} />
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                    {hit.questionPreview}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
