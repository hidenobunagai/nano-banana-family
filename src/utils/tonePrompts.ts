/**
 * P5 トーン切替 — tone suffixes auto-appended to the prompt.
 * The user picks a vibe; we append a Japanese quality-oriented direction
 * so high-quality output becomes the default even for short prompts.
 */
export interface TonePrompt {
  id: string;
  label: string;
  suffix: string;
  modes: Array<"icon" | "freestyle">;
}

export const TONE_PROMPTS: TonePrompt[] = [
  {
    id: "photo",
    label: "写真風",
    suffix: "写真風で、リアルな質感と自然な光の表現にしてください",
    modes: ["freestyle"],
  },
  {
    id: "illust",
    label: "イラスト風",
    suffix: "イラスト風で、手描きの温かみのある質感にしてください",
    modes: ["icon", "freestyle"],
  },
  {
    id: "minimal",
    label: "ミニマル",
    suffix: "ミニマルで、余白とシンプルさを重視した構成にしてください",
    modes: ["icon", "freestyle"],
  },
  {
    id: "pop",
    label: "ポップ",
    suffix: "ポップで、明るく元気な配色と雰囲気にしてください",
    modes: ["icon", "freestyle"],
  },
];
