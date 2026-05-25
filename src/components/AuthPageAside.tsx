import React from "react";
import {
  ADVISOR_NAME,
  ADVISOR_PROFILE_URL,
  LAB_NAME,
  UIC_LOGO_SRC,
  UNIVERSITY_NAME,
} from "../lib/guidelines";
import { authGradientTextClass } from "../lib/ui";

export default function AuthPageAside() {
  return (
    <aside className="flex flex-col justify-center py-8 md:py-12 md:pr-2 lg:pr-4">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
        Clinical
        <br />
        <span className={authGradientTextClass}>Annotation Tool</span>
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
        Review multimodal clinical cases, write structured summaries, and track
        annotation progress across your team.
      </p>
      <p
        className="mt-5 text-xs font-medium tracking-wide text-slate-400"
        aria-label="Secure, Structured, Trackable"
      >
        <span className="text-teal-200/90">Secure</span>
        <span className="mx-2 text-slate-600" aria-hidden>
          ·
        </span>
        <span className="text-teal-200/90">Structured</span>
        <span className="mx-2 text-slate-600" aria-hidden>
          ·
        </span>
        <span className="text-teal-200/90">Trackable</span>
      </p>
      <p className="mt-6 text-sm text-slate-400">
        Advisor:{" "}
        <a
          href={ADVISOR_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-200 hover:text-teal-100 underline underline-offset-2"
        >
          {ADVISOR_NAME}
        </a>
      </p>

      <div className="mt-10 flex items-center gap-3.5 border-t border-white/10 pt-6">
        <img
          src={UIC_LOGO_SRC}
          alt="University of Illinois Chicago"
          className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
          width={64}
          height={64}
        />
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-teal-200/95">{LAB_NAME}</p>
          <p className="mt-1 text-sm leading-snug text-slate-500">{UNIVERSITY_NAME}</p>
        </div>
      </div>
    </aside>
  );
}
