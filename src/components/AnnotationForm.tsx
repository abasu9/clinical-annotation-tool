import React, { useEffect, useState, useCallback } from "react";
import {
  REQUIRES_SUMMARIZATION_OPTIONS,
  SUMMARIZATION_REASON_OPTIONS,
} from "../lib/supabase";
import {
  TaskGuidelineModal,
  TaskGuidelineHelpButton,
  Task1GuidelineContent,
  Task2GuidelineContent,
} from "./TaskGuidelineModal";
import { countWords, MIN_TASK_WORDS, meetsMinWordCount } from "../lib/wordCount";

const SUMMARIZATION_SET = new Set<string>(REQUIRES_SUMMARIZATION_OPTIONS);
const REASON_SET = new Set<string>(SUMMARIZATION_REASON_OPTIONS);

function TaskWordCountBadge({ words }: { words: number }) {
  const ok = words >= MIN_TASK_WORDS;
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-sm font-semibold border ${
        ok
          ? "bg-emerald-50 border-emerald-400 text-emerald-800"
          : "bg-amber-50 border-amber-400 text-amber-900"
      }`}
      aria-live="polite"
    >
      {words} / {MIN_TASK_WORDS} words{ok ? " ✓" : " required"}
    </span>
  );
}

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
  const [task1HelpOpen, setTask1HelpOpen] = useState(false);
  const [task2HelpOpen, setTask2HelpOpen] = useState(false);

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
  const task1Words = countWords(local.objectiveImageDescription);
  const task2Words = countWords(local.finalMultimodalClinicalSummary);
  const task1Ok = meetsMinWordCount(local.objectiveImageDescription);
  const task2Ok = meetsMinWordCount(local.finalMultimodalClinicalSummary);

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


        {tasksRequired && (
          <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
            <span className="font-semibold">Required:</span> Task 1 and Task 2 must
            each be at least <strong>{MIN_TASK_WORDS} words</strong> before you can
            save a draft or submit.
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Task 1: Objective Image Description
                {tasksRequired && <span className="text-red-500"> *</span>}
              </label>
              <TaskGuidelineHelpButton
                label="Show Task 1 guidelines"
                onClick={() => setTask1HelpOpen(true)}
              />
            </div>
            {tasksRequired && <TaskWordCountBadge words={task1Words} />}
          </div>
          <textarea
            value={local.objectiveImageDescription}
            onChange={(e) => update({ objectiveImageDescription: e.target.value })}
            rows={6}
            disabled={local.imageStatus === "No"}
            className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y disabled:bg-slate-100 disabled:text-slate-400 ${
              tasksRequired && !task1Ok
                ? "border-amber-400 ring-1 ring-amber-200"
                : "border-slate-300"
            }`}
            placeholder={
              local.imageStatus === "No"
                ? "Not required when summarization is No"
                : `Describe what you see in the image… (minimum ${MIN_TASK_WORDS} words)`
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Task 2: Full Multimodal Clinical Summary
                {tasksRequired && <span className="text-red-500"> *</span>}
              </label>
              <TaskGuidelineHelpButton
                label="Show Task 2 guidelines"
                onClick={() => setTask2HelpOpen(true)}
              />
            </div>
            {tasksRequired && <TaskWordCountBadge words={task2Words} />}
          </div>
          <textarea
            value={local.finalMultimodalClinicalSummary}
            onChange={(e) =>
              update({ finalMultimodalClinicalSummary: e.target.value })
            }
            rows={6}
            disabled={local.imageStatus === "No"}
            className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y disabled:bg-slate-100 disabled:text-slate-400 ${
              tasksRequired && !task2Ok
                ? "border-amber-400 ring-1 ring-amber-200"
                : "border-slate-300"
            }`}
            placeholder={
              local.imageStatus === "No"
                ? "Not required when summarization is No"
                : `Write the clinical summary… (minimum ${MIN_TASK_WORDS} words)`
            }
          />
        </div>
      </div>

      <TaskGuidelineModal
        title="Task 1: Objective Image Description — Guidelines"
        open={task1HelpOpen}
        onClose={() => setTask1HelpOpen(false)}
      >
        <Task1GuidelineContent />
      </TaskGuidelineModal>
      <TaskGuidelineModal
        title="Task 2: Full Multimodal Clinical Summary — Guidelines"
        open={task2HelpOpen}
        onClose={() => setTask2HelpOpen(false)}
      >
        <Task2GuidelineContent />
      </TaskGuidelineModal>
    </div>
  );
}
