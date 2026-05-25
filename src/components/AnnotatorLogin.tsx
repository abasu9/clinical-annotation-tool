import React, { useState } from "react";
import {
  ANNOTATION_GUIDELINES_URL,
  LAB_NAME,
  ADVISOR_NAME,
  ADVISOR_PROFILE_URL,
} from "../lib/guidelines";

const STORAGE_KEY = "annotator_id";

export function loadStoredAnnotatorId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveStoredAnnotatorId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore — works without persistence */
  }
}

export function clearStoredAnnotatorId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface Props {
  onLogin: (id: string) => void;
  onAdmin: () => void;
}

export default function AnnotatorLogin({ onLogin, onAdmin }: Props) {
  const [id, setId] = useState(loadStoredAnnotatorId());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    saveStoredAnnotatorId(trimmed);
    onLogin(trimmed);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.45), transparent),
            radial-gradient(ellipse 60% 40% at 90% 10%, rgba(20, 184, 166, 0.35), transparent),
            radial-gradient(ellipse 50% 60% at 50% 100%, rgba(79, 70, 229, 0.25), transparent)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        <aside className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 lg:py-16">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-teal-200/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {LAB_NAME}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Clinical
            <br />
            <span className="bg-gradient-to-r from-teal-200 via-indigo-200 to-violet-200 bg-clip-text text-transparent">
              Annotation Tool
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            Review patient questions with images, capture structured summaries, and
            track progress across your team.
          </p>
          <p className="mt-6 text-sm text-slate-400">
            Advisor:{" "}
            <a
              href={ADVISOR_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-200 hover:text-teal-100 underline underline-offset-2"
            >
              {ADVISOR_NAME}
            </a>
          </p>
        </aside>

        <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-1 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="rounded-[14px] bg-white p-8 text-slate-900">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-600 text-white shadow-lg shadow-indigo-500/30">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-center text-xl font-bold text-slate-900">Welcome back</h2>
                <p className="mt-1 text-center text-sm text-slate-500">
                  Enter your annotator ID to continue
                </p>
                <form onSubmit={submit} className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Annotator ID
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="e.g. expert_001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!id.trim()}
                    className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg disabled:opacity-40 disabled:shadow-none"
                  >
                    Start annotating →
                  </button>
                </form>
                <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5">
                  <a
                    href={ANNOTATION_GUIDELINES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Annotation guidelines (PDF)
                  </a>
                  <button
                    type="button"
                    onClick={onAdmin}
                    className="rounded-lg py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    Admin access
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
