import React from "react";

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
}: Props) {
  const showResults = hits.length > 0;

  return (
    <div className="bg-indigo-600 px-4 sm:px-6 py-3 shadow-sm relative">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label
          htmlFor="sample-search"
          className="text-sm font-semibold text-white shrink-0"
        >
          Find sample
        </label>
        <div className="flex flex-1 gap-2 min-w-0">
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
            className="flex-1 min-w-0 rounded-lg border-0 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={disabled || !value.trim()}
            className="shrink-0 px-4 py-2 rounded-lg bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50 transition"
          >
            Search
          </button>
          {showResults && (
            <button
              type="button"
              onClick={onCloseResults}
              className="shrink-0 px-3 py-2 rounded-lg border border-white/40 text-white text-sm hover:bg-indigo-500 transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="max-w-4xl mx-auto mt-2 rounded-lg bg-white shadow-lg overflow-hidden text-left">
          <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-600 bg-slate-50">
            {hits.length} result{hits.length === 1 ? "" : "s"} — click a row to open
          </div>
          <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {hits.map((hit) => (
              <li key={`${hit.post_id}-${hit.index}`}>
                <button
                  type="button"
                  onClick={() => onSelectHit(hit.index)}
                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition"
                >
                  <span className="font-mono text-sm font-semibold text-indigo-700">
                    {hit.post_id}
                  </span>
                  <span className="ml-2 text-[11px] uppercase font-medium text-slate-500">
                    {hit.statusLabel}
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
