import React, { useState } from "react";
import { ANNOTATION_GUIDELINES_URL } from "../lib/guidelines";
import { authGradientButtonClass, authGradientButtonStyle } from "../lib/ui";
import AuthFormCard from "./AuthFormCard";
import AuthPageLayout from "./AuthPageLayout";

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

  const canContinue = id.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    saveStoredAnnotatorId(trimmed);
    onLogin(trimmed);
  };

  return (
    <AuthPageLayout>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Start{" "}
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            annotating
          </span>
        </h2>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="annotator-id" className="mb-1.5 block text-sm font-medium text-slate-600">
              Annotator ID
            </label>
            <input
              id="annotator-id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. expert_001"
              className="w-full rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              autoFocus
            />
          </div>

          <button
            type="submit"
            style={authGradientButtonStyle}
            aria-disabled={!canContinue}
            className={authGradientButtonClass(canContinue)}
          >
            Continue →
          </button>
          <button
            type="button"
            onClick={onAdmin}
            className="w-full rounded-xl border border-indigo-200/90 bg-white/70 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50/80"
          >
            Admin access
          </button>
        </form>

        <div className="mt-7 border-t border-indigo-100/80 pt-5 text-center text-sm">
          <a
            href={ANNOTATION_GUIDELINES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Annotation guidelines (PDF)
          </a>
        </div>
      </AuthFormCard>
    </AuthPageLayout>
  );
}
