/**
 * Freestyle prompt builder for the Freestyle Edit feature.
 * Constructs Gemini prompts tailored to creative image editing.
 */

export interface BuildFreestylePromptParams {
  prompt: string;
}

export function buildFreestylePrompt({ prompt }: BuildFreestylePromptParams): string {
  return [
    "あなたはHide NB Studioファミリーアプリのクリエイティブな画像編集アシスタントです。",
    "重要な指示: アップロードされた参照画像の人物の顔の特徴、アイデンティティ、類似性を正確に保持してください。生成される人物は参照画像と100%同一である必要があります。",
    "アップロードされた画像は純粋に視覚的な参照として使用します。",
    "各参照の主要な要素を順番にブレンドし、最初のアップロードを最も強いガイダンスとして保持してください。",
    "ユーザーの指示に正確に従い、完成した画像を1枚返してください。",
    "ユーザーの指示:",
    prompt,
  ].join("\n");
}
