"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { Palette, UserCircle } from "lucide-react";
import { LogOut } from "lucide-react";
import * as React from "react";
import type { NavMode } from "@/types/nav";

const HEADER_NAV_ITEMS = [
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
    <div className="flex h-dvh w-full overflow-hidden text-stone-900 selection:bg-amber-500/30">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Bar (Glass) */}
        <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-4 sm:px-8 z-30 bg-white/80 backdrop-blur-xl border-b border-amber-100 transition-all">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-stone-900 via-stone-700 to-stone-500 bg-clip-text text-transparent drop-shadow-sm tracking-tight">
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
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
                    active
                      ? "text-amber-700 bg-amber-50"
                      : "text-stone-500 hover:text-stone-800 hover:bg-stone-100",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-amber-500 rounded-full"
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
            className="text-stone-400 hover:text-red-500 hover:bg-red-50 gap-2"
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
