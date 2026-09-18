import { buildFreestylePrompt } from "./freestylePromptBuilder";

describe("buildFreestylePrompt", () => {
  it("includes the identity-preservation instructions", () => {
    const prompt = buildFreestylePrompt({ prompt: "テスト指示" });

    expect(prompt).toContain("Hide NB Studio");
    expect(prompt).toContain(
      "あなたはHide NB Studioファミリーアプリのクリエイティブな画像編集アシスタントです。",
    );
    expect(prompt).toContain(
      "重要な指示: アップロードされた参照画像の人物の顔の特徴、アイデンティティ、類似性を正確に保持してください。生成される人物は参照画像と100%同一である必要があります。",
    );
    expect(prompt).toContain("100%同一である必要があります");
  });

  it("instructs that reference images are used purely as visual information", () => {
    const prompt = buildFreestylePrompt({ prompt: "テスト指示" });

    expect(prompt).toContain("アップロードされた画像は純粋に視覚的な参照として使用します。");
    expect(prompt).toContain("純粋に視覚的な参照");
  });

  it("includes the blending instruction and the single-output instruction", () => {
    const prompt = buildFreestylePrompt({ prompt: "テスト指示" });

    expect(prompt).toContain(
      "各参照の主要な要素を順番にブレンドし、最初のアップロードを最も強いガイダンスとして保持してください。",
    );
    expect(prompt).toContain("ユーザーの指示に正確に従い、完成した画像を1枚返してください。");
  });

  it("embeds the user instruction after the 'ユーザーの指示:' line", () => {
    const userPrompt = "背景を南国のビーチに変えてください。";
    const prompt = buildFreestylePrompt({ prompt: userPrompt });

    expect(prompt).toContain(`ユーザーの指示:\n${userPrompt}`);
    const lines = prompt.split("\n");
    const labelIndex = lines.indexOf("ユーザーの指示:");
    expect(labelIndex).toBe(5);
    expect(lines[labelIndex + 1]).toBe(userPrompt);
  });

  it("embeds a multi-line prompt intact with newlines preserved", () => {
    const multilinePrompt = "1行目: スタイル変更\n2行目: 色調整\n3行目: 背景追加";
    const prompt = buildFreestylePrompt({ prompt: multilinePrompt });

    expect(prompt).toContain(`ユーザーの指示:\n${multilinePrompt}`);
    expect(prompt.endsWith(multilinePrompt)).toBe(true);
  });

  it("yields the fixed instruction block with the same number of lines for an empty prompt", () => {
    const prompt = buildFreestylePrompt({ prompt: "" });
    const lines = prompt.split("\n");

    expect(lines).toHaveLength(7);
    expect(lines[0]).toBe(
      "あなたはHide NB Studioファミリーアプリのクリエイティブな画像編集アシスタントです。",
    );
    expect(lines[1]).toBe(
      "重要な指示: アップロードされた参照画像の人物の顔の特徴、アイデンティティ、類似性を正確に保持してください。生成される人物は参照画像と100%同一である必要があります。",
    );
    expect(lines[2]).toBe("アップロードされた画像は純粋に視覚的な参照として使用します。");
    expect(lines[3]).toBe(
      "各参照の主要な要素を順番にブレンドし、最初のアップロードを最も強いガイダンスとして保持してください。",
    );
    expect(lines[4]).toBe("ユーザーの指示に正確に従い、完成した画像を1枚返してください。");
    expect(lines[5]).toBe("ユーザーの指示:");
    expect(lines[6]).toBe("");
  });

  it("returns deterministic output for the same input", () => {
    const params = { prompt: "髪型をショートカットにしてください" };

    expect(buildFreestylePrompt(params)).toBe(buildFreestylePrompt({ ...params }));
  });
});
