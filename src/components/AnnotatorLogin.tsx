import React, { useState } from "react";
import { ANNOTATION_GUIDELINES_URL } from "../lib/guidelines";
import {
  isBlindDisplayCode,
  resolveIaaCode,
  unlockIaaPin,
  verifyIaaPin,
} from "../lib/iaaAnnotators";
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
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const canContinue = id.trim().length > 0 && pin.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = id.trim();
    const pinTrimmed = pin.trim();
    if (!trimmed || !pinTrimmed) return;

    if (isBlindDisplayCode(trimmed)) {
      setError(
        "nf, c, sz, s, and w are display codes only. Log in with your real annotator ID + PIN."
      );
      return;
    }

    const code = resolveIaaCode(trimmed);
    if (!code) {
      setError(
        "Unknown annotator ID. Use your assigned ID (e.g. dr naafila), not a blind code."
      );
      return;
    }

    if (!verifyIaaPin(code, pinTrimmed)) {
      setError("Incorrect PIN.");
      return;
    }

    setError("");
    unlockIaaPin(code);
    saveStoredAnnotatorId(trimmed);
    onLogin(trimmed);
  };

  return (
    <AuthPageLayout>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Start{" "}
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            annotation or rating
          </span>
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with your annotator ID and private PIN. Then choose Annotation
          or Rating.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="annotator-id"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              Annotator ID
            </label>
            <input
              id="annotator-id"
              type="text"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setError("");
              }}
              placeholder="e.g. dr naafila"
              className="w-full rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="annotator-pin"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              PIN
            </label>
            <input
              id="annotator-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              placeholder="Your private PIN"
              className="w-full rounded-xl border border-slate-200/90 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              autoComplete="current-password"
            />
            {error ? (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            ) : null}
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
