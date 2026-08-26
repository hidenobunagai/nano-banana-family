"use client";

import { Button, cn } from "@/components/ui/Button";
import { NAV_ITEMS, type NavMode } from "@/types/nav";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";
import { useSession } from "next-auth/react";
import * as React from "react";

interface ShellProps {
  children: React.ReactNode;
  onSignOut: () => void;
  navMode: NavMode;
  onNavModeChange: (mode: NavMode) => void;
}

export function Shell({ children, onSignOut, navMode, onNavModeChange }: ShellProps) {
  const { data: session } = useSession();

  return (
    <div className="flex h-dvh w-full overflow-hidden text-[var(--color-neutral-900)] selection:bg-[var(--color-primary-600)]/20">
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-white/95 backdrop-blur-xl border-b border-[var(--color-neutral-300)]">
          <div>
            <h1 className="text-std-20 font-bold text-[var(--color-neutral-900)] tracking-tight">
              Hide NB Studio
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
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

          <div className="flex items-center gap-2 sm:gap-3">
            {session?.user && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--radius-full)] bg-[var(--color-neutral-100)] border border-[var(--color-neutral-200)]">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "ユーザー"}
                    className="w-6 h-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] flex items-center justify-center font-bold text-dns-14">
                    {(session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
                {session.user.name && (
                  <span className="hidden lg:inline text-dns-14 font-medium text-[var(--color-neutral-700)] max-w-[120px] truncate">
                    {session.user.name}
                  </span>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="text-[var(--color-neutral-600)] hover:text-[var(--color-error-dark)] hover:bg-[var(--color-error-light)] gap-2"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">サインアウト</span>
            </Button>
          </div>
        </header>

        <div
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-12 py-6 lg:py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8 scroll-smooth relative"
        >
          <div className="max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
