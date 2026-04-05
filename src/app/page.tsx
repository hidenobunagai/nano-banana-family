"use client";

import { FreestyleEditor } from "@/components/features/editor/FreestyleEditor";
import { IconCreator } from "@/components/features/editor/IconCreator";
import { Dock } from "@/components/layout/Dock";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/Button";
import type { NavMode } from "@/types/nav";
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
      <main className="min-h-dvh flex items-center justify-center bg-white text-stone-900">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium font-sans">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-300/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full max-w-3xl rounded-3xl glass-panel p-8 sm:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="space-y-4">
                <p className="inline-flex rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-base font-semibold text-gray-700">
                  Family-only creative studio
                </p>
                <h1 className="text-4xl font-display font-bold text-gray-900">Hide NB Studio</h1>
                <p className="text-lg leading-relaxed text-stone-700 sm:text-xl">
                  家族だけで使える、やさしいAI画像スタジオです。
                  <br />
                  サインインすると、自由生成・アイコン作成をすぐに始められます。
                </p>
              </div>

              <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-1">
                {SIGNED_OUT_FEATURES.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-bold text-stone-900">{title}</h2>
                    <p className="mt-2 text-base leading-relaxed text-stone-700">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-lg">
              <div className="space-y-3">
                <h2 className="text-xl font-display font-bold text-stone-900">
                  サインイン前に知っておきたいこと
                </h2>
                <ul className="space-y-2 text-base leading-relaxed text-stone-700">
                  <li>・Googleアカウントで本人確認してから利用します。</li>
                  <li>・JPG / PNG / WebP に対応し、送信前に自動で最適化します。</li>
                  <li>・生成中は進行状況を見ながら待てます。</li>
                </ul>
              </div>

              <Button
                onClick={() => signIn("google")}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 border-0"
              >
                Googleで始める
              </Button>

              <p className="text-sm leading-relaxed text-stone-600">
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
