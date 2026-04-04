import { buildIconPrompt, ICON_STYLES } from "./iconPromptBuilder";

describe("ICON_STYLES", () => {
  it("has 5 styles", () => {
    expect(ICON_STYLES).toHaveLength(5);
  });

  it("includes auto style", () => {
    const autoStyle = ICON_STYLES.find((s) => s.id === "auto");
    expect(autoStyle).toBeDefined();
  });

  it("all styles have required fields", () => {
    for (const style of ICON_STYLES) {
      expect(style.id).toBeDefined();
      expect(style.label).toBeDefined();
      expect(style.description).toBeDefined();
      expect(style.promptFragment).toBeDefined();
    }
  });
});

describe("buildIconPrompt", () => {
  it("builds basic prompt with name and style", () => {
    const prompt = buildIconPrompt({
      name: "John Doe",
      style: "flat-minimal",
    });
    expect(prompt).toContain('Contact name: "John Doe"');
    expect(prompt).toContain("flat, minimal design style");
    expect(prompt).toContain("CRITICAL INSTRUCTION");
  });

  it("includes url metadata when provided", () => {
    const prompt = buildIconPrompt({
      name: "Test",
      style: "auto",
      urlMeta: {
        title: "My Site",
        description: "A test site",
        ogImage: null,
      },
    });
    expect(prompt).toContain('Website title: "My Site"');
    expect(prompt).toContain('Website description: "A test site"');
  });

  it("includes custom prompt when provided", () => {
    const prompt = buildIconPrompt({
      name: "Test",
      style: "auto",
      customPrompt: "Make it blue",
    });
    expect(prompt).toContain("Additional instructions from user: Make it blue");
  });

  it("ignores empty custom prompt", () => {
    const prompt = buildIconPrompt({
      name: "Test",
      style: "auto",
      customPrompt: "   ",
    });
    expect(prompt).not.toContain("Additional instructions");
  });

  it("falls back to auto style for unknown style id", () => {
    const prompt = buildIconPrompt({
      name: "Test",
      style: "unknown" as never,
    });
    expect(prompt).toContain("Automatically choose the most appropriate");
  });

  it("includes square icon requirements", () => {
    const prompt = buildIconPrompt({
      name: "Test",
      style: "auto",
    });
    expect(prompt).toContain("512x512 pixels");
    expect(prompt).toContain("40x40 pixels");
    expect(prompt).toContain("circular crop");
    expect(prompt).toContain("Do not include any text labels, watermarks, or borders");
  });
});
