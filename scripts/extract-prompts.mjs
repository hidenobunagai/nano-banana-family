/**
 * Extract prompt references from Awesome-Nano-Banana-images README_ja.md
 * Usage: bun run scripts/extract-prompts.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const README_URL =
  "https://raw.githubusercontent.com/PicoTrex/Awesome-Nano-Banana-images/refs/heads/main/README_ja.md";

const GENDER_FIXES = [
  { from: /彼の/g, to: "その人の" },
  { from: /彼女の/g, to: "その人の" },
  { from: /彼は/g, to: "その人は" },
  { from: /彼女は/g, to: "その人は" },
  { from: /彼を/g, to: "その人を" },
  { from: /彼女を/g, to: "その人を" },
  { from: /彼が/g, to: "その人が" },
  { from: /彼女が/g, to: "その人が" },
  { from: /彼に/g, to: "その人に" },
  { from: /彼女に/g, to: "その人に" },
  { from: /彼と/g, to: "その人と" },
  { from: /彼女と/g, to: "その人と" },
  { from: /男性/g, to: "人物" },
  { from: /女性/g, to: "人物" },
  { from: /男の子/g, to: "子供" },
  { from: /女の子/g, to: "子供" },
];

function neutralizeGender(prompt) {
  let result = prompt;
  for (const { from, to } of GENDER_FIXES) {
    result = result.replace(from, to);
  }
  return result;
}

function categorize(title, prompt, isPro) {
  const combined = `${title} ${prompt}`;

  if (isPro) return "Pro活用";

  const categoryRules = [
    {
      name: "フィギュア・立体",
      keywords: [
        "フィギュア",
        "ガレージキット",
        "ぬいぐるみ",
        "彫刻",
        "大理石",
        "レゴ",
        "ミニチュア",
        "アクションフィギュア",
        "プラモデル",
        "インフレータブル",
        "おもちゃ",
        "分解展示",
        "足場",
        "チェスセット",
        "ジュエリー",
      ],
    },
    {
      name: "漫画・イラスト",
      keywords: [
        "漫画",
        "マンガ",
        "コミック",
        "イラスト",
        "線画",
        "浮世絵",
        "チョーク",
        "落書き",
        "コスプレ",
        "4コマ",
        "スタンプ",
      ],
    },
    {
      name: "ポートレート・人物",
      keywords: [
        "ポートレート",
        "証明写真",
        "アバター",
        "髪型",
        "ヘアスタイル",
        "メイク",
        "Vtuber",
        "クローン",
        "年齢",
        "着せ替え",
        "OOTD",
        "コーデ",
        "ポーズ",
        "表情",
        "輪郭",
      ],
    },
    {
      name: "デザイン・印刷物",
      keywords: [
        "ポスター",
        "新聞",
        "雑誌",
        "カバー",
        "フラッシュカード",
        "引用カード",
        "タロット",
        "手配書",
        "年賀状",
        "ステッカー",
        "シール",
        "壁紙",
        "ロゴ",
        "ピクトグラム",
        "フロッピーディスク",
        "透明",
      ],
    },
    {
      name: "パッケージ・商品",
      keywords: [
        "パッケージ",
        "グッズ",
        "製品写真",
        "商品",
        "UFOキャッチャー",
        "クレーン",
        "ショップ",
        "展示棚",
        "ブース",
      ],
    },
    {
      name: "シーン・背景",
      keywords: [
        "シーン",
        "都市",
        "風景",
        "マップ",
        "地図",
        "アイソメトリック",
        "分解図",
        "断面図",
        "舞台裏",
        "中つ国",
        "テーマパーク",
        "現実世界",
        "配置",
        "建物抽出",
      ],
    },
    { name: "ゲーム・UI", keywords: ["ゲーム", "RPG", "ステータス", "インターフェース", "格闘"] },
    {
      name: "インフォグラフィック",
      keywords: [
        "インフォグラフィック",
        "フローチャート",
        "相関図",
        "設定集",
        "レベル進化",
        "解説図",
        "注釈",
        "カロリー表示",
        "数学",
      ],
    },
    {
      name: "特殊効果",
      keywords: [
        "爆発",
        "ホログラム",
        "再帰",
        "魚眼",
        "星座",
        "痛車",
        "AR",
        "ウォーターマーク",
        "列車",
        "ラッピング",
        "フィルター",
        "テクスチャ",
        "ライティング",
        "カメラパラメータ",
      ],
    },
    { name: "写真・映像", keywords: ["絵コンテ", "映画", "セルフ", "時代", "比較", "分割写真"] },
    {
      name: "料理・食べ物",
      keywords: ["料理", "食材", "ランチ", "ハンバーガー", "食べ物", "カロリー"],
    },
    {
      name: "変換・加工",
      keywords: [
        "変換",
        "スタイル",
        "補正",
        "着色",
        "カラー化",
        "修復",
        "高解像度",
        "透過背景",
        "抽出",
      ],
    },
  ];

  for (const { name, keywords } of categoryRules) {
    if (keywords.some((kw) => combined.includes(kw))) {
      return name;
    }
  }

  return "その他";
}

function generateTags(title, prompt) {
  const tagMap = [
    { keywords: ["浮世絵", "フラッシュカード"], tag: "浮世絵" },
    { keywords: ["フィギュア", "ガレージキット", "アクションフィギュア"], tag: "フィギュア" },
    { keywords: ["漫画", "マンガ", "コミック"], tag: "漫画" },
    { keywords: ["ポスター", "映画"], tag: "ポスター" },
    { keywords: ["ステッカー", "シール"], tag: "ステッカー" },
    { keywords: ["ミニチュア", "ジオラマ"], tag: "ミニチュア" },
    { keywords: ["分解図", "断面図"], tag: "分解図" },
    { keywords: ["アイソメトリック", "等角"], tag: "アイソメトリック" },
    { keywords: ["線画", "着色"], tag: "線画" },
    { keywords: ["証明写真", "ポートレート", "アバター"], tag: "ポートレート" },
    { keywords: ["レゴ", "ブロック"], tag: "レゴ" },
    { keywords: ["海賊", "手配書"], tag: "海賊" },
    { keywords: ["タロット"], tag: "タロット" },
    { keywords: ["Vtuber", "バーチャル"], tag: "Vtuber" },
    { keywords: ["LINE", "スタンプ"], tag: "スタンプ" },
    { keywords: ["PIXAR", "ピクサー"], tag: "PIXAR風" },
    { keywords: ["ぬいぐるみ"], tag: "ぬいぐるみ" },
    { keywords: ["新聞", "雑誌", "カバー"], tag: "印刷物" },
    { keywords: ["マップ", "地図"], tag: "地図" },
    { keywords: ["AR"], tag: "AR" },
    { keywords: ["インフォグラフィック"], tag: "インフォグラフィック" },
    { keywords: ["コスプレ"], tag: "コスプレ" },
    { keywords: ["ヘアスタイル", "髪型"], tag: "髪型" },
    { keywords: ["大理石", "彫刻"], tag: "彫刻" },
    { keywords: ["料理", "食材"], tag: "料理" },
    { keywords: ["カラー化", "修復"], tag: "修復" },
    { keywords: ["ウォーターマーク"], tag: "ウォーターマーク" },
    { keywords: ["壁紙"], tag: "壁紙" },
    { keywords: ["ロゴ"], tag: "ロゴ" },
    { keywords: ["UFOキャッチャー", "クレーンゲーム"], tag: "UFOキャッチャー" },
    { keywords: ["RPG", "ステータス", "ゲーム"], tag: "ゲームUI" },
    { keywords: ["ピクトグラム"], tag: "ピクトグラム" },
    { keywords: ["パッケージ", "箱"], tag: "パッケージ" },
    { keywords: ["ホログラム"], tag: "ホログラム" },
    { keywords: ["痛車"], tag: "痛車" },
    { keywords: ["マインクラフト"], tag: "マインクラフト" },
    { keywords: ["ガンダム", "プラモデル"], tag: "プラモデル" },
    { keywords: ["チョーク", "黒板"], tag: "チョークアート" },
    { keywords: ["再帰"], tag: "再帰" },
    { keywords: ["爆発"], tag: "爆発エフェクト" },
    { keywords: ["星座"], tag: "星座" },
    { keywords: ["魚眼"], tag: "魚眼レンズ" },
  ];

  const combined = `${title} ${prompt}`;
  const tags = [];
  for (const { keywords, tag } of tagMap) {
    if (keywords.some((kw) => combined.includes(kw))) {
      tags.push(tag);
    }
  }
  return tags.length > 0 ? tags : ["その他"];
}

function parseReadme(markdown) {
  const entries = [];
  const caseRegex =
    /###\s+例\s*(\d+)[：:]\s*(?:\[([^\]]+)\]\([^)]+\))?([^\s（(]+)?(?:\s*（by\s*\[?@?([^\]）]+)\]?\s*）?\s*\))?\s*/g;

  let match;
  while ((match = caseRegex.exec(markdown)) !== null) {
    const caseNum = parseInt(match[1], 10);
    const title = (match[2] || match[3] || "").trim();
    const author = match[4] ? `@${match[4].trim()}` : "";

    if (!title) continue;

    const startPos = match.index + match[0].length;
    const remaining = markdown.slice(startPos);

    const promptMatch = remaining.match(/\*\*プロンプト:\*\*\s*\n+```(?:\w*)?\s*\n([\s\S]*?)\n```/);

    if (!promptMatch) continue;

    let prompt = promptMatch[1].trim();
    if (!prompt || prompt.length < 5) continue;

    const lastProIdx = markdown.lastIndexOf("Nano Banana Pro 事例", match.index);
    const lastRegularIdx = markdown.lastIndexOf("Nano Banana 事例", match.index);
    const isProCase = lastProIdx > lastRegularIdx;

    prompt = prompt.replace(/\n{2,}/g, "\n").trim();

    const category = categorize(title, prompt, isProCase);
    const tags = generateTags(title, prompt);

    entries.push({
      id: isProCase ? `pro-${caseNum}` : `case-${caseNum}`,
      title,
      category,
      prompt: neutralizeGender(prompt),
      tags,
      author,
      caseNumber: caseNum,
      isPro: isProCase,
    });
  }

  return entries;
}

function generateTypeScript(entries) {
  const header = `// Auto-generated from Awesome-Nano-Banana-images README_ja.md
// Do not edit manually. Run \`bun run scripts/extract-prompts.mjs\` to regenerate.

export type PromptReference = {
  id: string;
  title: string;
  category: string;
  prompt: string;
  tags: string[];
  author: string;
  caseNumber: number;
  isPro: boolean;
};

export const PROMPT_REFERENCES: PromptReference[] = ${JSON.stringify(entries, null, 2)};
`;

  return header;
}

async function main() {
  console.log("Fetching README_ja.md...");
  const response = await fetch(README_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch README: ${response.status} ${response.statusText}`);
  }
  const markdown = await response.text();
  console.log(`Fetched ${markdown.length} bytes`);

  console.log("Parsing prompts...");
  const entries = parseReadme(markdown);
  console.log(`Extracted ${entries.length} prompts`);

  const categories = {};
  for (const entry of entries) {
    categories[entry.category] = (categories[entry.category] || 0) + 1;
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  const output = generateTypeScript(entries);
  const outputPath = resolve(__dirname, "..", "src", "promptReferences.ts");

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, "utf-8");
  console.log(`\nWritten to ${outputPath}`);
  console.log(`Total: ${entries.length} prompt references`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
