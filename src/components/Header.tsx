import React from "react";
import AnnotationStatusPill from "./AnnotationStatusPill";
import {
  ANNOTATION_GUIDELINES_URL,
  LAB_NAME,
  ADVISOR_NAME,
  ADVISOR_PROFILE_URL,
  UIC_LOGO_SRC,
  UNIVERSITY_NAME,
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
    <header className="relative shrink-0 bg-slate-950 text-white px-4 sm:px-6 py-2.5 border-b border-white/[0.08]">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-teal-500/0 via-teal-400/45 to-indigo-400/0"
        aria-hidden
      />
      <div className="mx-auto grid max-w-[1800px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:gap-x-4">
        <div className="col-start-1 flex min-w-0 items-center gap-3">
          <img
            src={UIC_LOGO_SRC}
            alt="University of Illinois Chicago"
            className="h-11 w-11 shrink-0 object-contain sm:h-14 sm:w-14"
            width={56}
            height={56}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-teal-200/95">
              {LAB_NAME}
            </p>
            <p className="mt-0.5 truncate text-xs leading-snug text-slate-400">
              {UNIVERSITY_NAME}
            </p>
            <p className="mt-0.5 hidden text-[11px] text-slate-500 lg:block">
              Advisor:{" "}
              <a
                href={ADVISOR_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300/90 hover:text-white hover:underline"
              >
                {ADVISOR_NAME}
              </a>
            </p>
          </div>
        </div>

        <h1 className="col-start-2 px-1 text-center text-sm font-bold tracking-tight whitespace-nowrap sm:text-base lg:text-lg">
          Clinical Annotation Tool
        </h1>

        <div className="col-start-3 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 text-xs">
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
            <AnnotationStatusPill status={annotationStatus} variant="dark" />
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
