import { buildStoryPrompt } from "./storyPromptBuilder";

describe("buildStoryPrompt", () => {
  it("includes the shared identity-preservation instructions", () => {
    const prompt = buildStoryPrompt({
      storyType: "picture-book",
      tone: "funny",
      language: "ja",
    });

    expect(prompt).toContain("Hide NB Studio");
    expect(prompt).toContain("【最重要指示】");
    expect(prompt).toContain("アイデンティティを正確に保持");
    expect(prompt).toContain("1枚の完成作品画像を生成してください。");
  });

  it("describes each story type", () => {
    const expected: Record<string, string> = {
      "picture-book": "温かみのある絵本風のイラストと物語（ページレイアウト）",
      comic: "面白おかしい4コマ漫画・アメコミ風のコマ割りイラスト（吹き出しとセリフ付き）",
      newspaper: "ユーモアあふれる家族新聞・観察レポート風のレイアウト（見出し、記事、写真解説）",
    };

    for (const [storyType, description] of Object.entries(expected)) {
      const prompt = buildStoryPrompt({
        storyType: storyType as never,
        tone: "funny",
        language: "ja",
      });
      expect(prompt).toContain(`【制作形式】: ${description}`);
    }
  });

  it("describes each tone", () => {
    const expected: Record<string, string> = {
      funny: "くすっと笑えるユーモアとツッコミ満載の面白いトーン",
      cute: "とっても可愛らしく愛らしいトーン",
      adventure: "ワクワクする大冒険・ファンタジートーン",
      warm: "心温まる家族の絆を感じるほのぼのトーン",
    };

    for (const [tone, description] of Object.entries(expected)) {
      const prompt = buildStoryPrompt({
        storyType: "picture-book",
        tone: tone as never,
        language: "ja",
      });
      expect(prompt).toContain(`【トーン】: ${description}`);
    }
  });

  it("describes each output language", () => {
    expect(
      buildStoryPrompt({ storyType: "picture-book", tone: "funny", language: "ja" }),
    ).toContain("【言語】: 自然な日本語");
    expect(
      buildStoryPrompt({ storyType: "picture-book", tone: "funny", language: "en" }),
    ).toContain("【言語】: 英語（簡単な子供向け英語）");
  });

  it("keeps representative storyType x tone x language combinations distinct", () => {
    const combos = [
      { storyType: "comic", tone: "adventure", language: "en" },
      { storyType: "newspaper", tone: "warm", language: "ja" },
      { storyType: "comic", tone: "cute", language: "ja" },
    ] as const;

    const prompts = combos.map((combo) => buildStoryPrompt(combo));

    expect(prompts[0]).toContain("【制作形式】: 面白おかしい4コマ漫画");
    expect(prompts[0]).toContain("【トーン】: ワクワクする大冒険・ファンタジートーン");
    expect(prompts[0]).toContain("【言語】: 英語（簡単な子供向け英語）");

    expect(prompts[1]).toContain("【制作形式】: ユーモアあふれる家族新聞");
    expect(prompts[1]).toContain("【トーン】: 心温まる家族の絆を感じるほのぼのトーン");
    expect(prompts[1]).toContain("【言語】: 自然な日本語");

    expect(prompts[2]).toContain("【トーン】: とっても可愛らしく愛らしいトーン");

    expect(new Set(prompts).size).toBe(3);
  });

  it("includes a trimmed custom prompt when provided", () => {
    const prompt = buildStoryPrompt({
      storyType: "picture-book",
      tone: "funny",
      language: "ja",
      customPrompt: "  公園での冒険  ",
    });

    expect(prompt).toContain("【追加の要望】: 公園での冒険");
  });

  it("omits the custom prompt block and any blank line when it is empty", () => {
    for (const customPrompt of [undefined, "", "   "]) {
      const prompt = buildStoryPrompt({
        storyType: "picture-book",
        tone: "funny",
        language: "ja",
        customPrompt,
      });

      expect(prompt).not.toContain("【追加の要望】");
      expect(prompt).not.toContain("\n\n");
      expect(prompt.split("\n")).toHaveLength(6);
    }
  });

  it("returns the same prompt for equivalent params", () => {
    const params = { storyType: "newspaper", tone: "cute", language: "ja" } as const;

    expect(buildStoryPrompt(params)).toBe(buildStoryPrompt({ ...params }));
  });
});
