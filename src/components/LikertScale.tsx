import React from "react";
import { LIKERT_MAX, LIKERT_MIN, type LikertValue } from "../lib/ratingCriteria";

interface Props {
  name: string;
  label: string;
  help?: string;
  value: LikertValue;
  onChange: (value: LikertValue) => void;
  disabled?: boolean;
}

const LABELS = ["1", "2", "3", "4", "5"] as const;

export default function LikertScale({
  name,
  label,
  help,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      {help ? (
        <p className="mt-0.5 text-xs text-slate-500 leading-snug">{help}</p>
      ) : null}
      <div
        className="mt-2 flex flex-wrap items-center gap-1.5"
        role="radiogroup"
        aria-label={label}
      >
        {Array.from(
          { length: LIKERT_MAX - LIKERT_MIN + 1 },
          (_, i) => (LIKERT_MIN + i) as Exclude<LikertValue, null>
        ).map((n) => {
          const selected = value === n;
          return (
            <label
              key={n}
              className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition ${
                selected
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50"
              } ${disabled ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={n}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(n)}
              />
              {LABELS[n - 1]}
            </label>
          );
        })}
        <span className="ml-1 text-[11px] text-slate-400">1=low · 5=high</span>
      </div>
    </fieldset>
  );
}
