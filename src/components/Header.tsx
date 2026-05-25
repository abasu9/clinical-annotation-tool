import React from "react";
import {
  ANNOTATION_GUIDELINES_URL,
  LAB_NAME,
  ADVISOR_NAME,
  ADVISOR_PROFILE_URL,
} from "../lib/guidelines";

interface Props {
  annotatorId: string;
  datasetName?: string;
  sampleIndex?: number;
  totalSamples?: number;
  annotationStatus?: string;
  onAdmin: () => void;
  onLogout: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  unstarted: "bg-white/15 text-slate-200 ring-1 ring-white/20",
  draft: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
  submitted: "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30",
  skipped: "bg-orange-400/20 text-orange-100 ring-1 ring-orange-300/30",
};

export default function Header({
  annotatorId,
  datasetName,
  sampleIndex,
  totalSamples,
  annotationStatus,
  onAdmin,
  onLogout,
}: Props) {
  return (
    <header className="bg-slate-950 text-white border-b border-white/10 shadow-lg shadow-slate-900/20 px-4 sm:px-6 py-3">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-600 shadow-md shadow-indigo-900/50">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
              Clinical Annotation Tool
            </h1>
            <p className="text-xs text-teal-200/90 truncate">{LAB_NAME}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 hidden md:block">
              Advisor:{" "}
              <a
                href={ADVISOR_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-white hover:underline"
              >
                {ADVISOR_NAME}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm flex-wrap justify-end">
          {datasetName && (
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 ring-1 ring-white/10">
              <span className="text-slate-400">Dataset</span> {datasetName}
            </span>
          )}
          {totalSamples != null && totalSamples > 0 && sampleIndex != null ? (
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 ring-1 ring-white/10">
              Sample {sampleIndex} / {totalSamples}
            </span>
          ) : null}
          {annotationStatus && (
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                STATUS_STYLES[annotationStatus] ?? STATUS_STYLES.unstarted
              }`}
            >
              {annotationStatus}
            </span>
          )}
          {annotatorId && (
            <span className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 ring-1 ring-white/10">
              <span className="text-slate-400">You</span> {annotatorId}
            </span>
          )}
          <a
            href={ANNOTATION_GUIDELINES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-2.5 py-1 font-medium text-indigo-300 hover:bg-white/10 hover:text-white transition"
          >
            Guidelines
          </a>
          <button
            type="button"
            onClick={onAdmin}
            className="rounded-lg px-2.5 py-1 font-medium text-indigo-300 hover:bg-white/10 hover:text-white transition"
          >
            Admin
          </button>
          {annotatorId && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg px-2.5 py-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
