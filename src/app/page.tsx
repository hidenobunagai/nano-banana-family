"use client";

import { FlipbookCreator } from "@/components/features/editor/FlipbookCreator";
import { FreestyleEditor } from "@/components/features/editor/FreestyleEditor";
import { PromptOnlyCreator } from "@/components/features/editor/PromptOnlyCreator";
import { SimpleEditor } from "@/components/features/editor/SimpleEditor";
import { type NavMode } from "@/components/layout/Dock";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { status } = useSession();
  const [mode, setMode] = useState<NavMode>("simple");

  const handleSignOut = () => void signOut();

  if (status === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-slate-400 font-medium font-sans">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full max-w-md p-8 rounded-3xl glass-panel flex flex-col items-center text-center gap-8"
        >
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold bg-gradient-to-br from-emerald-200 via-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
              Hide NB Studio
            </h1>
            <p className="text-slate-400 leading-relaxed font-sans">
              家族限定のクリエイティブスタジオです。
              <br />
              Googleアカウントでサインインして始めましょう。
            </p>
          </div>
          <Button
            onClick={() => signIn("google")}
            size="lg"
            className="w-full h-12 text-lg font-medium bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 border-0"
          >
            Let&apos;s Start
          </Button>
        </motion.div>
      </main>
    );
  }

  return (
    <Shell currentMode={mode} onModeChange={setMode} onSignOut={handleSignOut}>
      <motion.div
        key={mode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {mode === "simple" ? (
          <SimpleEditor />
        ) : mode === "flipbook" ? (
          <FlipbookCreator />
        ) : mode === "freestyle" ? (
          <FreestyleEditor />
        ) : (
          <PromptOnlyCreator />
        )}
      </motion.div>
    </Shell>
  );
}
