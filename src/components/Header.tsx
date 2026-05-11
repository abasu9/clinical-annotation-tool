import React from "react";

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
  unstarted: "bg-slate-200 text-slate-700",
  draft: "bg-amber-100 text-amber-800",
  submitted: "bg-emerald-100 text-emerald-800",
  skipped: "bg-orange-100 text-orange-800",
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
    <header className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
          Clinical Multimodal Annotation Tool
        </h1>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          {datasetName && (
            <span className="text-slate-600">
              <span className="font-medium">Dataset:</span> {datasetName}
            </span>
          )}
          {totalSamples && totalSamples > 0 ? (
            <span className="text-slate-600">
              <span className="font-medium">Sample</span> {sampleIndex} / {totalSamples}
            </span>
          ) : null}
          {annotationStatus && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                STATUS_STYLES[annotationStatus] ?? STATUS_STYLES.unstarted
              }`}
            >
              {annotationStatus}
            </span>
          )}
          {annotatorId && (
            <span className="text-slate-600">
              <span className="font-medium">Annotator:</span> {annotatorId}
            </span>
          )}
          <button
            onClick={onAdmin}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
          >
            Admin
          </button>
          {annotatorId && (
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-slate-700 text-xs"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
