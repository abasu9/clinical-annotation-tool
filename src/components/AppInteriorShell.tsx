import React from "react";
import { appInteriorBg } from "../lib/ui";

interface Props {
  children: React.ReactNode;
}

/** Light dashboard backdrop — grid + soft shapes; keeps focus on work content. */
export default function AppInteriorShell({ children }: Props) {
  return (
    <div className={`${appInteriorBg} relative flex min-h-screen flex-col`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,rgba(99,102,241,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.07)_1px,transparent_1px)] bg-[length:32px_32px]"
          style={{
            maskImage:
              "radial-gradient(ellipse 85% 70% at 50% 35%, black 15%, transparent 72%)",
          }}
        />
        <div className="absolute -left-24 top-[28%] h-80 w-80 rounded-full bg-indigo-200/35 blur-3xl" />
        <div className="absolute -right-20 bottom-[-4rem] h-[22rem] w-[22rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute left-[42%] top-[62%] h-56 w-56 rounded-full bg-violet-100/45 blur-3xl" />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
