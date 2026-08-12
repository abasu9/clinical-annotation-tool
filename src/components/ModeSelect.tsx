import React from "react";
import { authGradientButtonClass, authGradientButtonStyle } from "../lib/ui";
import { resolveIaaCode } from "../lib/iaaAnnotators";

export type WorkMode = "annotate" | "rate";

interface Props {
  annotatorId: string;
  onSelect: (mode: WorkMode) => void;
  onLogout: () => void;
}

export default function ModeSelect({
  annotatorId,
  onSelect,
  onLogout,
}: Props) {
  const code = resolveIaaCode(annotatorId);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-600/90 via-indigo-500/85 to-teal-600/75 p-6 shadow-lg shadow-indigo-500/25 text-white">
        <p className="text-sm text-indigo-100">
          Signed in as{" "}
          <span className="font-semibold text-white">{annotatorId}</span>
          {code ? (
            <span className="ml-2 rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs">
              {code}
            </span>
          ) : null}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">
          Choose your task
        </h2>
        <p className="mt-1 text-sm text-indigo-100">
          Annotation writes new descriptions and summaries. Rating evaluates
          other annotators’ submissions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect("annotate")}
          className="group text-left rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/50 to-teal-50/30 p-6 shadow-md transition hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-400/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Division 1
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-indigo-700">
            Annotation
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Write an objective image description and a multimodal clinical
            summary for each post.
          </p>
          <span
            style={authGradientButtonStyle}
            className={`mt-5 inline-flex ${authGradientButtonClass(true)} !w-auto px-4 py-2 text-xs`}
          >
            Start annotating →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelect("rate")}
          className="group text-left rounded-2xl border border-teal-200/80 bg-gradient-to-br from-white via-teal-50/40 to-indigo-50/30 p-6 shadow-md transition hover:border-teal-400 hover:shadow-lg hover:shadow-teal-400/20 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Division 2
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 group-hover:text-teal-800">
            Rating
          </h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Rate the other four annotators on shared questions (Likert 1–5).
            Opens the rating page directly.
          </p>
          <span className="mt-5 inline-flex rounded-xl border border-teal-300 bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-sm">
            Start rating →
          </span>
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onLogout}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Switch account
        </button>
      </div>
    </div>
  );
}
