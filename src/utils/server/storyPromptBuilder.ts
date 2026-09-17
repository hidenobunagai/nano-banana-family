/**
 * Story prompt builder for the Story Creator feature.
 * Constructs Gemini prompts tailored to picture-book / comic / newspaper
 * generation. Kept as a pure function so the route stays plumbing-only.
 */

export type StoryTypeId = "picture-book" | "comic" | "newspaper";
export type StoryToneId = "funny" | "cute" | "adventure" | "warm";
export type StoryLanguageId = "ja" | "en";

export interface BuildStoryPromptParams {
  storyType: StoryTypeId;
  tone: StoryToneId;
  language: StoryLanguageId;
  customPrompt?: string;
}

const TYPE_DESCRIPTIONS: Record<StoryTypeId, string> = {
  "picture-book": "温かみのある絵本風のイラストと物語（ページレイアウト）",
  comic: "面白おかしい4コマ漫画・アメコミ風のコマ割りイラスト（吹き出しとセリフ付き）",
  newspaper: "ユーモアあふれる家族新聞・観察レポート風のレイアウト（見出し、記事、写真解説）",
};

const TONE_DESCRIPTIONS: Record<StoryToneId, string> = {
  funny: "くすっと笑えるユーモアとツッコミ満載の面白いトーン",
  cute: "とっても可愛らしく愛らしいトーン",
  adventure: "ワクワクする大冒険・ファンタジートーン",
  warm: "心温まる家族の絆を感じるほのぼのトーン",
};

const LANG_INSTRUCTIONS: Record<StoryLanguageId, string> = {
  ja: "自然な日本語",
  en: "英語（簡単な子供向け英語）",
};

export function buildStoryPrompt({
  storyType,
  tone,
  language,
  customPrompt,
}: BuildStoryPromptParams): string {
  const trimmedCustomPrompt = customPrompt?.trim();

  return [
    "あなたは家族専用アプリ「Hide NB Studio」の専属ストーリー作家・イラストレーターです。",
    "【最重要指示】アップロードされた写真の人物の顔の特徴、表情、アイデンティティを正確に保持し、写真に写っている家族メンバーが主人公となる作品を作成してください。",
    `【制作形式】: ${TYPE_DESCRIPTIONS[storyType]}`,
    `【トーン】: ${TONE_DESCRIPTIONS[tone]}`,
    `【言語】: ${LANG_INSTRUCTIONS[language]}`,
    trimmedCustomPrompt ? `【追加の要望】: ${trimmedCustomPrompt}` : "",
    "写真の状況を読み取り、見る人を笑顔にする素晴らしい1枚の完成作品画像を生成してください。",
  ]
    .filter(Boolean)
    .join("\n");
}
