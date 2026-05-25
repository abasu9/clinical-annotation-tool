import React, { useState } from "react";
import {
  isAdminCredentialsConfigured,
  unlockAdmin,
} from "../lib/adminGate";
import { LAB_NAME } from "../lib/guidelines";
import { btnPrimary, inputClass } from "../lib/ui";

interface Props {
  onUnlocked: () => void;
  onCancel: () => void;
}

export default function AdminPasswordGate({ onUnlocked, onCancel }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isAdminCredentialsConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-1 shadow-2xl max-w-md w-full">
          <div className="rounded-[14px] bg-white p-8 text-center">
            <h1 className="text-xl font-bold text-slate-800 mb-2">Admin not configured</h1>
            <p className="text-sm text-slate-600 mb-6">
              Set <code className="text-xs bg-slate-100 px-1 rounded">VITE_ADMIN_USERNAME</code> and{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">VITE_ADMIN_PASSWORD</code> in{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">.env</code>, then restart the dev server.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (unlockAdmin(username, password)) {
      onUnlocked();
      return;
    }
    setError("Incorrect username or password.");
    setPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-xs text-teal-200/80 mb-4">{LAB_NAME}</p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-1 shadow-2xl">
          <div className="rounded-[14px] bg-white p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Admin signin</h1>
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!username.trim() || !password}
                className={`w-full ${btnPrimary}`}
              >
                Sign in
              </button>
            </form>
            <button
              type="button"
              onClick={onCancel}
              className="w-full mt-3 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
