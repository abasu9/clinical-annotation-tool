import type { CSSProperties } from "react";

/** Cyan → indigo → violet — login / admin primary actions */
export const authGradientButtonStyle: CSSProperties = {
  background: "linear-gradient(90deg, #0d9488 0%, #4f46e5 50%, #7c3aed 100%)",
  color: "#ffffff",
};

export const authGradientButtonClass = (enabled: boolean) =>
  `w-full rounded-xl border-0 py-3 text-sm font-semibold shadow-md shadow-indigo-600/50 transition ${
    enabled
      ? "hover:shadow-lg hover:shadow-indigo-600/60 active:scale-[0.99]"
      : "cursor-not-allowed"
  }`;

/** Gradient headline on dark auth aside — same hues as primary buttons */
export const authGradientTextClass =
  "bg-gradient-to-r from-teal-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent";

/** Shared Tailwind class groups for interior pages (matches login branding). */

export const appInteriorBg =
  "min-h-screen bg-gradient-to-b from-indigo-50/95 via-slate-50 to-teal-50/70";

export const contentCanvas =
  "bg-gradient-to-b from-indigo-50/50 via-slate-50/80 to-teal-50/40";

export const panel =
  "rounded-xl shadow-lg shadow-indigo-300/25 border border-indigo-200/70 overflow-hidden flex flex-col h-full bg-gradient-to-br from-white via-indigo-50/30 to-slate-50";

/** Light header: colored tint + dark text (readable controls). */
export const panelHeader =
  "px-4 py-3 border-b border-indigo-200 bg-indigo-100";

export const panelTitle = "text-sm font-semibold text-slate-900";

export const panelSubtext = "text-xs text-slate-600 mt-0.5";

export const panelToolBtn =
  "px-2.5 py-1 text-xs font-semibold text-slate-800 border border-indigo-300 rounded-lg bg-white shadow-sm hover:bg-indigo-50 transition";

export const inputClass =
  "w-full border border-indigo-200/80 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400";

export const btnPrimary =
  "rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 disabled:shadow-none";

export const adminCard =
  "rounded-xl border border-indigo-200/70 bg-gradient-to-br from-white via-indigo-50/40 to-teal-50/30 p-5 shadow-lg shadow-indigo-300/20";

export const interiorStrip =
  "border-b border-indigo-200 bg-indigo-50/90";
