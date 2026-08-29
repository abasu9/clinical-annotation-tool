import React, { useState } from "react";
import { createAnnotator } from "../lib/data";
import {
  suggestNameIncludes,
  cleanDisplayName,
  type AnnotatorAdminProfile,
} from "../lib/annotatorDatasets";
import { adminCard, btnPrimary, inputClass } from "../lib/ui";

interface Props {
  annotators: AnnotatorAdminProfile[];
  onCreated: (annotator: AnnotatorAdminProfile) => void;
}

function randomPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function AnnotatorManager({ annotators, onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState(randomPin());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setDisplayName("");
    setLoginId("");
    setPin(randomPin());
    setError("");
  };

  const handleCreate = async () => {
    setBusy(true);
    setError("");
    try {
      const created = await createAnnotator({
        display_name: displayName,
        login_id: loginId,
        pin,
        name_includes: suggestNameIncludes(displayName),
      });
      onCreated(created);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add annotator.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={adminCard}>
      <h3 className="text-lg font-semibold text-slate-800">Annotators</h3>
      <p className="mt-1 text-sm text-slate-500">
        Add annotators here. Share each login ID and PIN privately with that
        person. New annotators can annotate assigned datasets; Rating is only
        for the five IAA pilot doctors.
      </p>

      {annotators.length > 0 ? (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Login ID</th>
                  <th className="py-2 pr-3">PIN</th>
                </tr>
              </thead>
              <tbody>
                {annotators.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">
                      {cleanDisplayName(a.display_name)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-700">
                      {a.login_id}
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold tracking-wide text-slate-900">
                      {a.pin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {annotators.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-indigo-100 bg-white/80 p-4"
              >
                <p className="font-semibold text-slate-900">
                  {cleanDisplayName(a.display_name)}
                </p>
                <p className="mt-1 font-mono text-sm text-slate-700">
                  {a.login_id}
                </p>
                <div className="mt-2">
                  <span className="font-mono text-lg font-semibold tracking-wide text-slate-900">
                    {a.pin}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">No annotators yet.</p>
      )}

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h4 className="text-sm font-semibold text-slate-800">Add annotator</h4>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="new-annotator-name"
              className="text-sm font-medium text-slate-600"
            >
              Display name
            </label>
            <input
              id="new-annotator-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Dr Smith"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label
              htmlFor="new-annotator-login"
              className="text-sm font-medium text-slate-600"
            >
              Login ID
            </label>
            <input
              id="new-annotator-login"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. dr smith"
              className={`${inputClass} mt-1.5`}
            />
          </div>
          <div>
            <label
              htmlFor="new-annotator-pin"
              className="text-sm font-medium text-slate-600"
            >
              PIN
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="new-annotator-pin"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => setPin(randomPin())}
                className="shrink-0 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
              >
                New PIN
              </button>
            </div>
          </div>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy || !displayName.trim() || !loginId.trim() || !pin.trim()}
            className={`${btnPrimary} disabled:opacity-50`}
          >
            {busy ? "Adding…" : "Add annotator"}
          </button>
        </div>
      </div>
    </div>
  );
}
