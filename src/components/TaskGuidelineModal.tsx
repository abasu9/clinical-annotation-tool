import React, { useEffect } from "react";

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function TaskGuidelineModal({ title, open, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guideline-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <h4 id="guideline-modal-title" className="text-sm font-semibold text-slate-800 pr-2">
            {title}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-700 text-xl leading-none"
            aria-label="Close guidelines"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-xs text-slate-600 space-y-3 leading-relaxed">
          {children}
        </div>
        <div className="px-5 py-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface HelpButtonProps {
  onClick: () => void;
  label: string;
}

export function TaskGuidelineHelpButton({ onClick, label }: HelpButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 bg-slate-100 text-slate-600 text-xs font-bold hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      aria-label={label}
      title={label}
    >
      ?
    </button>
  );
}

export function Task1GuidelineContent() {
  return (
    <>
      <p>
        Write a factual, clinical description of what is visible in the image, as if
        describing it to a colleague who cannot see it. Written{" "}
        <strong>independently</strong> of the user&apos;s text. Include approximate
        measurements or extent within this description whenever they can be
        reasonably estimated. Measurements are part of the image description, not a
        separate field.
      </p>
      <div>
        <p className="font-semibold text-slate-700 mb-1">Rules</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Describe only what is objectively visible in the image.</li>
          <li>
            Do not reference the user&apos;s text, story, symptoms, or stated concern.
          </li>
          <li>
            Use descriptive language: color, shape, size, texture, location,
            distribution, borders, symmetry.
          </li>
          <li>
            Use uncertainty-aware phrasing: &ldquo;appears to show,&rdquo; &ldquo;consistent
            with,&rdquo; &ldquo;possible.&rdquo;
          </li>
          <li>
            If the image is a report/lab screenshot, describe the key visible values.
          </li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">
          Measurement rules (within this description)
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Include approximate size, count, location, or spread when reasonably
            estimable.
          </li>
          <li>
            Use approximate language: &ldquo;about,&rdquo; &ldquo;approximately,&rdquo;
            &ldquo;small,&rdquo; &ldquo;large,&rdquo; &ldquo;localized,&rdquo;
            &ldquo;diffuse.&rdquo;
          </li>
          <li>
            Do not invent exact sizes unless explicitly mentioned in the image.
          </li>
          <li>
            If a report provides a measurement, preserve the exact report value.
          </li>
          <li>If countable lesions, approximate the count.</li>
          <li>If diffuse, describe extent instead of size.</li>
        </ul>
      </div>
    </>
  );
}

export function Task2GuidelineContent() {
  return (
    <>
      <p>
        Write a concise clinical summary that combines the user&apos;s main text concern
        with the objective image findings from Task 1. The goal is to create a
        doctor-friendly summary that clearly captures what the user wants to know
        while including the most relevant visual information. This output should
        usually be <strong>one combined clinical question</strong>. Use 2–3 short
        sentences only when the case is too complex to fit clearly into one question.
      </p>
      <div>
        <p className="font-semibold text-slate-700 mb-1">Rules</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Capture the user&apos;s main concern and important subquestions.</li>
          <li>Integrate relevant text details with the image findings from Task 1.</li>
          <li>Use third-person wording. Avoid I, my, me, we, our.</li>
          <li>Keep wording concise, simple, and clinically useful.</li>
          <li>Preserve important numerical details from the text and image.</li>
          <li>Include demographics only when clinically useful.</li>
          <li>
            Include user-stated measurements, lab values, report values, medication
            doses, timing, duration, pregnancy weeks, age, weight, or other relevant
            numbers.
          </li>
          <li>
            Include image-based findings and approximate measurements only when they
            are important to the user&apos;s question.
          </li>
          <li>Do not answer the question.</li>
          <li>
            Do not give advice, reassurance, triage instructions, or treatment
            recommendations.
          </li>
          <li>
            Do not introduce speculative diagnoses that are not mentioned by the user
            or supported by the visible image/report.
          </li>
        </ul>
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">What to include</p>
        <dl className="space-y-2">
          <div>
            <dt className="font-medium text-slate-700">User&apos;s main question</dt>
            <dd>
              Always include the central ask: &ldquo;What is this?&rdquo; &ldquo;Is this
              infected?&rdquo; &ldquo;Need ER?&rdquo; &ldquo;Cancer?&rdquo; &ldquo;Normal?&rdquo;
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Age and sex</dt>
            <dd>
              Include when clinically useful, especially for children, pregnancy,
              elderly, sex-specific concerns.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Key symptoms</dt>
            <dd>
              Major symptoms, duration, worsening, pain, fever, bleeding, swelling, or
              functional limitation.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">User-stated numbers</dt>
            <dd>
              Age, duration, weight, temperature, medication dose, lab values, report
              measurements, pregnancy weeks, injury timing. If the user writes it in
              their post, keep it.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Relevant medications / history</dt>
            <dd>
              Only when related to the concern: anticoagulants with bleeding,
              antibiotics with infection, pregnancy, immune conditions, surgery.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Image findings</dt>
            <dd>
              Include visible findings from the image such as redness, swelling, wound
              edges, rash distribution, lesion color, approximate size, count,
              location, or report values.
            </dd>
          </div>
        </dl>
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">What to exclude</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            Emotional language, panic, apologies, gratitude, or long personal background
            unless clinically necessary.
          </li>
          <li>
            Irrelevant demographics that do not help understand the clinical question.
          </li>
          <li>
            Speculative diagnoses not mentioned by the user or not clearly supported by
            the image/report.
          </li>
          <li>
            Medical advice, reassurance, triage instructions, or treatment
            recommendations.
          </li>
          <li>Full patient history unless needed to understand the question.</li>
          <li>Overly precise image measurements when no info is available.</li>
        </ul>
      </div>
    </>
  );
}
