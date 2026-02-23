"use client";

import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";
import * as React from "react";

interface ShellProps {
  children: React.ReactNode;
  onSignOut: () => void;
}

export function Shell({ children, onSignOut }: ShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden text-slate-100 selection:bg-emerald-500/30">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Bar (Glass) */}
        <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-4 sm:px-8 z-30 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 transition-all">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
              Hide NB Studio
            </h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-slate-400 hover:text-red-400 hover:bg-red-950/30 gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-12 pt-24 pb-32 scroll-smooth relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
