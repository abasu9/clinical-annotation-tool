import React, { useEffect, useState, useCallback } from "react";
import {
  REQUIRES_SUMMARIZATION_OPTIONS,
  SUMMARIZATION_REASON_OPTIONS,
} from "../lib/supabase";

const SUMMARIZATION_SET = new Set<string>(REQUIRES_SUMMARIZATION_OPTIONS);
const REASON_SET = new Set<string>(SUMMARIZATION_REASON_OPTIONS);

export interface FormData {
  imageStatus: string;
  summarizationReason: string;
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
  }, [
    value.imageStatus,
    value.summarizationReason,
    value.objectiveImageDescription,
    value.finalMultimodalClinicalSummary,
  ]);

  const update = useCallback(
    (patch: Partial<FormData>) => {
      const next = { ...local, ...patch };
      setLocal(next);
      onChange(next);
    },
    [local, onChange]
  );

  const tasksRequired = local.imageStatus === "Yes";

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
            Does this question require summarization?{" "}
            <span className="text-red-500">*</span>
          </label>
          <select
            value={local.imageStatus}
            onChange={(e) => {
              const val = e.target.value;
              const patch: Partial<FormData> = { imageStatus: val };
              if (val === "Yes") patch.summarizationReason = "";
              update(patch);
            }}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">— Select —</option>
            {local.imageStatus && !SUMMARIZATION_SET.has(local.imageStatus) && (
              <option value={local.imageStatus}>
                {local.imageStatus} (legacy — pick Yes or No)
              </option>
            )}
            {REQUIRES_SUMMARIZATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1.5">
            Choose <strong>Yes</strong> to complete both tasks below. Choose{" "}
            <strong>No</strong> if summarization is not needed — then pick a{" "}
            <strong>Reason</strong>.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reason
            {local.imageStatus === "No" && (
              <span className="text-red-500"> *</span>
            )}
          </label>
          {local.imageStatus === "Yes" ? (
            <p className="text-sm text-slate-500 border border-slate-200 rounded px-3 py-2 bg-slate-50">
              Not needed when summarization is <strong>Yes</strong>.
            </p>
          ) : (
            <>
              <select
                value={local.summarizationReason}
                onChange={(e) =>
                  update({ summarizationReason: e.target.value })
                }
                disabled={local.imageStatus !== "No"}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {local.imageStatus === "No"
                    ? "— Select —"
                    : "— Select No above first —"}
                </option>
                {local.summarizationReason &&
                  !REASON_SET.has(local.summarizationReason) && (
                    <option value={local.summarizationReason}>
                      {local.summarizationReason} (legacy)
                    </option>
                  )}
                {SUMMARIZATION_REASON_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1.5">
                {local.imageStatus === "No"
                  ? "Why is summarization not required?"
                  : "Choose No for summarization to enable this dropdown."}
              </p>
            </>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Task 1: Objective Image Description
            {tasksRequired && <span className="text-red-500"> *</span>}
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
            disabled={local.imageStatus === "No"}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y disabled:bg-slate-100 disabled:text-slate-400"
            placeholder={
              local.imageStatus === "No"
                ? "Not required when summarization is No"
                : "Describe what you see in the image…"
            }
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Task 2: Final Multimodal Clinical Summary
            {tasksRequired && <span className="text-red-500"> *</span>}
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
            disabled={local.imageStatus === "No"}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y disabled:bg-slate-100 disabled:text-slate-400"
            placeholder={
              local.imageStatus === "No"
                ? "Not required when summarization is No"
                : "Combine the user's concern with image findings…"
            }
          />
        </div>
      </div>
    </div>
  );
}
