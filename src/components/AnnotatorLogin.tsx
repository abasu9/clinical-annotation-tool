import React, { useState } from "react";
import { ANNOTATION_GUIDELINES_URL } from "../lib/guidelines";

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">
          Clinical Multimodal Annotation Tool
        </h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Enter your annotator ID to begin
        </p>
        <form onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Annotator ID
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. expert_001"
            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4"
            autoFocus
          />
          <button
            type="submit"
            disabled={!id.trim()}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            Start Annotating
          </button>
        </form>
        <a
          href={ANNOTATION_GUIDELINES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-3 text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View annotation guidelines (PDF)
        </a>
        <button
          onClick={onAdmin}
          className="w-full mt-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
        >
          Admin
        </button>
      </div>
    </div>
  );
}
