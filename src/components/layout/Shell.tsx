"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { Palette, UserCircle, Wand2 } from "lucide-react";
import { LogOut } from "lucide-react";
import * as React from "react";
import type { NavMode } from "./Dock";

const HEADER_NAV_ITEMS = [
  { id: "simple", label: "Editor", icon: Wand2 },
  { id: "freestyle", label: "Freestyle", icon: Palette },
  { id: "icon", label: "Icon", icon: UserCircle },
] as const;

interface ShellProps {
  children: React.ReactNode;
  onSignOut: () => void;
  navMode: NavMode;
  onNavModeChange: (mode: NavMode) => void;
}

export function Shell({ children, onSignOut, navMode, onNavModeChange }: ShellProps) {
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

          {/* Desktop center nav (hidden on mobile) */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1">
            {HEADER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = navMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavModeChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                    active
                      ? "text-white bg-white/10"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-12 pt-24 pb-20 lg:pb-8 scroll-smooth relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
