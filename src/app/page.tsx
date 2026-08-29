"use client";

import { FreestyleEditor } from "@/components/features/editor/FreestyleEditor";
import { IconCreator } from "@/components/features/editor/IconCreator";
import { StoryCreator } from "@/components/features/editor/StoryCreator";
import { Dock } from "@/components/layout/Dock";
import { Shell } from "@/components/layout/Shell";
import { LoadingStudio } from "@/components/layout/LoadingStudio";
import { Button } from "@/components/ui/Button";
import type { NavMode } from "@/types/nav";
import { motion } from "framer-motion";
import { BookOpen, Palette, UserCircle } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { status } = useSession();
  const [mode, setMode] = useState<NavMode>("freestyle");

  const handleSignOut = () => void signOut();

  if (status === "loading") {
    return <LoadingStudio />;
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-[var(--color-background)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--color-primary-600)]/5 rounded-full blur-[120px] pointer-events-none animate-float" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-2xl"
        >
          <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-display font-bold text-[var(--color-neutral-900)]">
                Hide NB Studio
              </h1>
              <p className="text-[var(--color-neutral-500)]">家族専用の AI 画像スタジオ</p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 rounded-2xl border border-[var(--color-neutral-300)] bg-white p-3 sm:px-4 sm:py-3 shadow-[var(--shadow-level-1)] text-center sm:text-left">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                  <Palette className="w-5 h-5" />
                </div>
                <span className="text-std-14 sm:text-std-16 font-medium text-[var(--color-neutral-800)]">
                  自由生成
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 rounded-2xl border border-[var(--color-neutral-300)] bg-white p-3 sm:px-4 sm:py-3 shadow-[var(--shadow-level-1)] text-center sm:text-left">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                  <UserCircle className="w-5 h-5" />
                </div>
                <span className="text-std-14 sm:text-std-16 font-medium text-[var(--color-neutral-800)]">
                  アイコン
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 rounded-2xl border border-[var(--color-neutral-300)] bg-white p-3 sm:px-4 sm:py-3 shadow-[var(--shadow-level-1)] text-center sm:text-left">
                <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-std-14 sm:text-std-16 font-medium text-[var(--color-neutral-800)]">
                  ストーリー
                </span>
              </div>
            </div>

            {/* Sign-in */}
            <div className="space-y-3">
              <Button
                onClick={() => signIn("google")}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] shadow-[0_4px_14px_var(--color-primary-600)/30] border-0"
              >
                Google でサインイン
              </Button>
              <p className="text-center text-dns-14 text-[var(--color-neutral-500)]">
                許可されたアカウントのみ利用できます
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <Shell onSignOut={handleSignOut} navMode={mode} onNavModeChange={setMode}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {mode === "freestyle" ? (
          <FreestyleEditor />
        ) : mode === "icon" ? (
          <IconCreator />
        ) : (
          <StoryCreator />
        )}
      </motion.div>

      <Dock currentMode={mode} onModeChange={setMode} />
    </Shell>
  );
}
