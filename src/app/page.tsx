"use client";

import { FreestyleEditor } from "@/components/features/editor/FreestyleEditor";
import { IconCreator } from "@/components/features/editor/IconCreator";
import { Dock } from "@/components/layout/Dock";
import type { NavMode } from "@/types/nav";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { Loader2, Palette, UserCircle } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

const SIGNED_OUT_FEATURES = [
  {
    icon: Palette,
    title: "自由なAI生成",
    description:
      "参考画像と自由文から、雰囲気を合わせた生成ができます。参考プロンプトも140種類以上から選べます。",
  },
  {
    icon: UserCircle,
    title: "アイコン作成",
    description: "名前やURL、参考画像から家族向けのアイコン案をまとめて作れます。",
  },
];

export default function Home() {
  const { status } = useSession();
  const [mode, setMode] = useState<NavMode>("freestyle");

  const handleSignOut = () => void signOut();

  if (status === "loading") {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#FFFEF7] text-stone-900">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-slate-400 font-medium font-sans">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-[#FFFEF7] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-400/10 rounded-full blur-[120px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-yellow-300/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-3xl rounded-3xl glass-panel p-8 sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="space-y-4">
                <p className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-sm font-medium text-amber-700">
                  Family-only creative studio
                </p>
                <h1 className="text-4xl font-display font-bold bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-sm text-balance">
                  Hide NB Studio
                </h1>
                <p className="text-base leading-relaxed text-stone-500 sm:text-lg">
                  家族だけで使える、やさしいAI画像スタジオです。
                  <br />
                  サインインすると、自由生成・アイコン作成をすぐに始められます。
                </p>
              </div>

              <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-1">
                {SIGNED_OUT_FEATURES.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm shadow-amber-100/40"
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-semibold text-stone-800">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 rounded-3xl border border-white/70 bg-white/80 p-6 text-center shadow-lg shadow-amber-100/40">
              <div className="space-y-3">
                <h2 className="text-xl font-display font-semibold text-stone-800">
                  サインイン前に知っておきたいこと
                </h2>
                <ul className="space-y-2 text-sm leading-relaxed text-stone-500">
                  <li>・Googleアカウントで本人確認してから利用します。</li>
                  <li>・JPG / PNG / WebP に対応し、送信前に自動で最適化します。</li>
                  <li>・生成中は進行状況を見ながら待てます。</li>
                </ul>
              </div>

              <Button
                onClick={() => signIn("google")}
                size="lg"
                className="w-full h-12 text-lg font-medium bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 border-0"
              >
                Googleで始める
              </Button>

              <p className="text-xs leading-relaxed text-stone-400">
                許可されたGoogleアカウントのみ利用できます。うまく入れない場合は、管理者に登録状況をご確認ください。
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
        className="w-full pb-24"
      >
        {mode === "freestyle" ? <FreestyleEditor /> : <IconCreator />}
      </motion.div>

      <Dock currentMode={mode} onModeChange={setMode} />
    </Shell>
  );
}
