export interface StarterPrompt {
  id: string;
  label: string;
  prompt: string;
  modes: Array<"icon" | "freestyle" | "both">;
}

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "transparent-bg",
    label: "背景透過",
    prompt:
      "背景を完全に透過した画像にしてください。被写体だけをきれいな輪郭で切り抜いた形でお願いします。",
    modes: ["icon"],
  },
  {
    id: "business-card",
    label: "名刺風",
    prompt:
      "名刺デザイン風のシンプルで洗練された画像にしてください。ビジネス向けの清潔感のある配色とレイアウトでお願いします。",
    modes: ["freestyle"],
  },
  {
    id: "mascot",
    label: "マスコット風",
    prompt:
      "親しみやすいマスコットキャラクター風のイラストにしてください。丸みのあるかわいいデザインで、単体で使いやすい中央寄りの構図でお願いします。",
    modes: ["both"],
  },
  {
    id: "app-icon",
    label: "アプリアイコン",
    prompt:
      "アプリアイコン向けの画像にしてください。中央にシンプルで認識しやすいシンボルを配置し、背景はフラットな単色で。角丸フレームを想定した余白を取ってください。",
    modes: ["icon"],
  },
  {
    id: "monochrome-lineart",
    label: "モノクロ線画",
    prompt:
      "モノクロの線画イラストにしてください。輪郭線をきれいに整え、塗りは最小限にして白黒でシャープな仕上がりでお願いします。",
    modes: ["freestyle"],
  },
  {
    id: "soft-gradient",
    label: "ソフトグラデ",
    prompt:
      "ソフトなグラデーションカラーを背景に使った、やわらかい雰囲気の画像にしてください。色の境界線が目立たないようになめらかに。",
    modes: ["both"],
  },
];
