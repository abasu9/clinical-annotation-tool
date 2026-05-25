import React, { useState } from "react";
import {
  isAdminCredentialsConfigured,
  unlockAdmin,
} from "../lib/adminGate";
import { authGradientButtonClass, authGradientButtonStyle } from "../lib/ui";
import AuthFormCard from "./AuthFormCard";
import AuthPageLayout from "./AuthPageLayout";

interface Props {
  onUnlocked: () => void;
  onCancel: () => void;
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15";

export default function AdminPasswordGate({ onUnlocked, onCancel }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isAdminCredentialsConfigured()) {
    return (
      <AuthPageLayout>
        <AuthFormCard>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin not configured</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Set <code className="rounded bg-slate-100 px-1 text-xs">VITE_ADMIN_USERNAME</code> and{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">VITE_ADMIN_PASSWORD</code> in{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">.env</code>, then restart the dev
            server.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 w-full rounded-xl border border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            ← Back to login
          </button>
        </AuthFormCard>
      </AuthPageLayout>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    if (unlockAdmin(username, password)) {
      onUnlocked();
      return;
    }
    setError("Incorrect username or password.");
    setPassword("");
  };

  const canSubmit = Boolean(username.trim() && password);

  return (
    <AuthPageLayout>
      <AuthFormCard>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
            Admin
          </span>
        </h2>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="admin-username" className="mb-1.5 block text-sm font-medium text-slate-600">
              Username
            </label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldClass}
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <button
            type="submit"
            style={authGradientButtonStyle}
            aria-disabled={!canSubmit}
            className={authGradientButtonClass(canSubmit)}
          >
            Sign in
          </button>
        </form>

        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-xl border border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          ← Back to login
        </button>
      </AuthFormCard>
    </AuthPageLayout>
  );
}
