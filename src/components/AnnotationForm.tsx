import React, { useEffect, useState, useCallback } from "react";
import { IMAGE_STATUS_OPTIONS } from "../lib/supabase";

const STATUS_SET = new Set<string>(IMAGE_STATUS_OPTIONS);

export interface FormData {
  imageStatus: string;
  objectiveImageDescription: string;
  finalMultimodalClinicalSummary: string;
}

interface Props {
  value: FormData;
  onChange: (data: FormData) => void;
  errors: string[];
}

export default function AnnotationForm({ value, onChange, errors }: Props) {
  const [local, setLocal] = useState<FormData>(value);

  useEffect(() => {
    setLocal(value);
  }, [value.imageStatus, value.objectiveImageDescription, value.finalMultimodalClinicalSummary]);

  const update = useCallback(
    (patch: Partial<FormData>) => {
      const next = { ...local, ...patch };
      setLocal(next);
      onChange(next);
    },
    [local, onChange]
  );

  const onStatusChange = (val: string) => {
    const patch: Partial<FormData> = { imageStatus: val };
    if (val === "Image not assessable" && !local.objectiveImageDescription.trim()) {
      patch.objectiveImageDescription = "Image not assessable.";
    }
    update(patch);
  };

  const objectiveRequired = local.imageStatus === "No medical finding visible";

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-slate-700">Annotation</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            {errors.map((e, i) => (
              <p key={i} className="text-red-700 text-sm">
                {e}
              </p>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Image Status <span className="text-red-500">*</span>
          </label>
          <select
            value={local.imageStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">— Select —</option>
            {local.imageStatus && !STATUS_SET.has(local.imageStatus) && (
              <option value={local.imageStatus}>
                {local.imageStatus} (legacy — pick a new status)
              </option>
            )}
            {IMAGE_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Task 1: Objective Image Description
            {objectiveRequired && <span className="text-red-500"> *</span>}
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Describe only what is visible in the image. Use color, shape,
            approximate size, texture, location, distribution, borders, and
            symmetry. Do not diagnose or advise.
          </p>
          <textarea
            value={local.objectiveImageDescription}
            onChange={(e) => update({ objectiveImageDescription: e.target.value })}
            rows={5}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
            placeholder="Describe what you see in the image…"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Task 2: Final Multimodal Clinical Summary{" "}
            <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Combine the user&apos;s main concern with relevant image findings.
            Keep it concise, third-person, doctor-friendly, and do not answer the
            question.
          </p>
          <textarea
            value={local.finalMultimodalClinicalSummary}
            onChange={(e) =>
              update({ finalMultimodalClinicalSummary: e.target.value })
            }
            rows={5}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
            placeholder={"Combine the user's concern with image findings…"}
          />
        </div>
      </div>
    </div>
  );
}
