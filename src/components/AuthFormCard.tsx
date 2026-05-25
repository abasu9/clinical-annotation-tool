import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function AuthFormCard({ children }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-white/95 shadow-[0_28px_64px_-16px_rgba(15,23,42,0.45),0_12px_28px_-10px_rgba(79,70,229,0.18)] backdrop-blur-xl ring-1 ring-indigo-100/60">
      <div className="h-2 bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500" />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white/80 to-teal-50/30"
        aria-hidden
      />
      <div className="relative p-8">{children}</div>
    </div>
  );
}
