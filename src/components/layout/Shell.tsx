"use client";

import * as React from "react";
import { Dock, type NavMode } from "./Dock";

interface ShellProps {
  children: React.ReactNode;
  currentMode: NavMode;
  onModeChange: (mode: NavMode) => void;
  onSignOut: () => void;
}

export function Shell({
  children,
  currentMode,
  onModeChange,
  onSignOut,
}: ShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-100 selection:bg-amber-500/30">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Bar (Glass) */}
        <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-8 z-30 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 transition-all">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
              Hide NB Studio
            </h1>
          </div>
          {/* We can add user profile or settings here later */}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-24 p-6 lg:p-12 pb-32 scroll-smooth relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>

        {/* Floating Dock */}
        <Dock
          currentMode={currentMode}
          onModeChange={onModeChange}
          onSignOut={onSignOut}
        />
      </main>
    </div>
  );
}
