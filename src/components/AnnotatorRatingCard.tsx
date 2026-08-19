import React from "react";
import LikertScale from "./LikertScale";
import {
  DESCRIPTION_CRITERIA,
  SUMMARY_CRITERIA,
  type AnnotatorRatingScores,
} from "../lib/ratingCriteria";
import type { IaaCode } from "../lib/iaaAnnotators";
import { panel, panelHeader, panelTitle } from "../lib/ui";

interface Props {
  /** Blind code only — never a real name (nf, c, sz, s, w). */
  code: IaaCode;
  imageDescription: string;
  summary: string;
  scores: AnnotatorRatingScores;
  onChange: (scores: AnnotatorRatingScores) => void;
  disabled?: boolean;
}

export default function AnnotatorRatingCard({
  code,
  imageDescription,
  summary,
  scores,
  onChange,
  disabled,
}: Props) {
  const prefix = `ann-${code}`;

  return (
    <section className={`${panel} !h-auto`}>
      <div className={panelHeader}>
        <h3 className={panelTitle}>
          Annotator{" "}
          <span className="font-mono uppercase tracking-wide">{code}</span>
          <span className="ml-2 text-xs font-medium text-slate-600">
            · image description + summary
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        <div className="border-b border-indigo-100 p-4 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Image description
          </p>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {imageDescription.trim() ? (
              imageDescription
            ) : (
              <span className="italic text-slate-400">No description</span>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {DESCRIPTION_CRITERIA.map((c) => (
              <LikertScale
                key={c.key}
                name={`${prefix}-desc-${c.key}`}
                label={c.label}
                help={c.help}
                value={scores.description[c.key]}
                disabled={disabled}
                onChange={(v) =>
                  onChange({
                    ...scores,
                    description: { ...scores.description, [c.key]: v },
                  })
                }
              />
            ))}
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary
          </p>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {summary.trim() ? (
              summary
            ) : (
              <span className="italic text-slate-400">No summary</span>
            )}
          </div>
          <div className="mt-4 space-y-4">
            {SUMMARY_CRITERIA.map((c) => (
              <LikertScale
                key={c.key}
                name={`${prefix}-sum-${c.key}`}
                label={c.label}
                help={c.help}
                value={scores.summary[c.key]}
                disabled={disabled}
                onChange={(v) =>
                  onChange({
                    ...scores,
                    summary: { ...scores.summary, [c.key]: v },
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
