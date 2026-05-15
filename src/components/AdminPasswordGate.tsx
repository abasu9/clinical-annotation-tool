import React, { useState } from "react";
import {
  isAdminCredentialsConfigured,
  unlockAdmin,
} from "../lib/adminGate";

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md text-center">
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">Admin sign in</h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Username and password required for import and export
        </p>
        {error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
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
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim() || !password}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 transition"
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
  );
}
