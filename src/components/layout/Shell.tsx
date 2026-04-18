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
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-white/95 backdrop-blur-xl border-b border-[var(--color-neutral-200)]">
          <div>
            <h1 className="text-std-20 font-bold text-[var(--color-neutral-900)] tracking-tight">
              Hide NB Studio
            </h1>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {HEADER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = navMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavModeChange(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-oln-16 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                    active
                      ? "text-[var(--color-neutral-900)] bg-[var(--color-neutral-100)]"
                      : "text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)] hover:bg-[var(--color-neutral-50)]",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="header-nav-indicator"
                      className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--color-primary-600)] rounded-full"
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
            className="text-[var(--color-neutral-600)] hover:text-[var(--color-error-dark)] hover:bg-[var(--color-error-light)] gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">サインアウト</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-12 py-6 lg:py-8 pb-24 lg:pb-8 scroll-smooth relative">
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
