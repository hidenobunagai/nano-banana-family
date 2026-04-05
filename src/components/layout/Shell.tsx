"use client";

import { Button, cn } from "@/components/ui/Button";
import type { NavMode } from "@/types/nav";
import { motion } from "framer-motion";
import { LogOut, Palette, UserCircle } from "lucide-react";
import * as React from "react";

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
    <div className="flex h-dvh w-full overflow-hidden text-[#111827] selection:bg-[#2563eb]/20">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-4 sm:px-8 z-30 bg-white/90 backdrop-blur-xl border-b border-[#e5e7eb] transition-all">
          <div className="pointer-events-auto">
            <h1 className="text-std-24 font-bold text-[#111827] tracking-tight">Hide NB Studio</h1>
          </div>

          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-1">
            {HEADER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = navMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavModeChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-[20px] text-oln-16 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]",
                    active
                      ? "text-[#111827] bg-[#f3f4f6]"
                      : "text-[#6b7280] hover:text-[#111827] hover:bg-[#f9fafb]",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#2563eb] rounded-full"
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
            className="text-[#4b5563] hover:text-[#991b1b] hover:bg-[#fef2f2] gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">サインアウト</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-12 pt-24 pb-20 lg:pb-8 scroll-smooth relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
