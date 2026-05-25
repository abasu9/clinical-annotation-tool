import React from "react";

/** 96px tile (wider spacing), faint plus marks for a calmer background. */
const GRID_PATTERN = `url("data:image/svg+xml,%3Csvg width='96' height='96' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.55'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

interface Props {
  children: React.ReactNode;
}

export default function AuthPageShell({ children }: Props) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99, 102, 241, 0.45), transparent),
            radial-gradient(ellipse 60% 40% at 90% 10%, rgba(20, 184, 166, 0.35), transparent),
            radial-gradient(ellipse 50% 60% at 50% 100%, rgba(79, 70, 229, 0.25), transparent)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: GRID_PATTERN }}
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
