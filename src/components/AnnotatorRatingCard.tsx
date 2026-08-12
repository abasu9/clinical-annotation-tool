import React from "react";
import LikertScale from "./LikertScale";
import {
  DESCRIPTION_CRITERIA,
  SUMMARY_CRITERIA,
  type AnnotatorRatingScores,
  type DescriptionCriteriaScores,
  type SummaryCriteriaScores,
} from "../lib/ratingCriteria";
import type { IaaCode } from "../lib/iaaAnnotators";
import { panel, panelHeader, panelTitle } from "../lib/ui";

type Section = "description" | "summary";

interface Props {
  /** Blind code only — never a real name (nf, c, sz, s, w). */
  code: IaaCode;
  section: Section;
  text: string;
  scores: AnnotatorRatingScores;
  onChange: (scores: AnnotatorRatingScores) => void;
  disabled?: boolean;
}

export default function AnnotatorRatingCard({
  code,
  section,
  text,
  scores,
  onChange,
  disabled,
}: Props) {
  const prefix = `ann-${code}-${section}`;
  const criteria =
    section === "description" ? DESCRIPTION_CRITERIA : SUMMARY_CRITERIA;
  const sectionLabel =
    section === "description" ? "Image description" : "Summary";

  return (
    <section className={`${panel} !h-auto`}>
      <div className={panelHeader}>
        <h3 className={panelTitle}>
          Annotator{" "}
          <span className="font-mono uppercase tracking-wide">{code}</span>
          <span className="ml-2 text-xs font-medium text-slate-600">
            · {sectionLabel}
          </span>
        </h3>
      </div>

      <div className="p-4">
        <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
          {text.trim() ? (
            text
          ) : (
            <span className="italic text-slate-400">
              No {sectionLabel.toLowerCase()}
            </span>
          )}
        </div>

        <div className="mt-4 space-y-4">
          {criteria.map((c) => (
            <LikertScale
              key={c.key}
              name={`${prefix}-${c.key}`}
              label={c.label}
              help={c.help}
              value={
                section === "description"
                  ? scores.description[c.key as keyof DescriptionCriteriaScores]
                  : scores.summary[c.key as keyof SummaryCriteriaScores]
              }
              disabled={disabled}
              onChange={(v) => {
                if (section === "description") {
                  onChange({
                    ...scores,
                    description: {
                      ...scores.description,
                      [c.key]: v,
                    },
                  });
                } else {
                  onChange({
                    ...scores,
                    summary: {
                      ...scores.summary,
                      [c.key]: v,
                    },
                  });
                }
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
