import React from "react";
import { AUTH_FOOTER_LINE } from "../lib/guidelines";
import AuthPageAside from "./AuthPageAside";
import AuthPageShell from "./AuthPageShell";

interface Props {
  children: React.ReactNode;
}

export default function AuthPageLayout({ children }: Props) {
  return (
    <AuthPageShell>
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 md:grid-cols-2 md:items-center gap-8 px-4 sm:px-6 lg:gap-12 lg:px-10 py-8 md:py-10">
          <AuthPageAside />
          <main className="relative flex items-center justify-center py-4 md:py-8">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[min(28rem,70vh)] w-[min(24rem,90vw)] -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <div className="absolute inset-0 rounded-full bg-teal-400/25 blur-[88px]" />
              <div className="absolute inset-[12%] rounded-full bg-indigo-500/30 blur-[72px]" />
              <div className="absolute inset-[28%] rounded-full bg-violet-500/15 blur-[48px]" />
            </div>
            <div className="relative z-10 w-full max-w-sm">{children}</div>
          </main>
        </div>

        <footer className="shrink-0 border-t border-white/10 px-4 py-5 text-center">
          <p className="text-[11px] sm:text-xs tracking-wide text-slate-400">
            {AUTH_FOOTER_LINE}
          </p>
        </footer>
      </div>
    </AuthPageShell>
  );
}
