"use client";

import IminTutorialWorkspace from "./imin-tutorial-workspace";

export default function IminTutorial() {
  return (
    <section className="relative left-1/2 min-h-svh w-screen -translate-x-1/2 border-y border-slate-200 bg-white text-[#111827]">
      <div className="flex min-h-svh flex-col">
        <IminTutorialWorkspace />
      </div>
    </section>
  );
}
