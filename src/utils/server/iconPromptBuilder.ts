/**
 * Icon prompt builder for the Icon Creator feature.
 * Constructs Gemini prompts tailored to contact-icon generation.
 */

import type { UrlMetadata } from "./urlMetadata";

export type IconStyleId =
  | "flat-minimal"
  | "gradient-modern"
  | "illustrated"
  | "photo-circle"
  | "auto";

export interface IconStyle {
  id: IconStyleId;
  label: string;
  description: string;
  promptFragment: string;
}

export const ICON_STYLES: IconStyle[] = [
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とアイコンシンボル",
    promptFragment:
      "Use a flat, minimal design style with solid color fills, clean geometric shapes, and a single representative symbol or monogram. No gradients, no shadows, no textures. The palette should be limited to 2-3 harmonious colors.",
  },
  {
    id: "gradient-modern",
    label: "グラデーション・モダン",
    description: "鮮やかなグラデーション背景",
    promptFragment:
      "Use a modern gradient design style with vibrant, smooth color transitions as the background. Overlay a clean white or light-colored symbol or monogram. The gradient should feel contemporary and eye-catching, similar to popular app icons.",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいイラスト",
    promptFragment:
      "Use a warm, hand-drawn illustration style with soft outlines, gentle colors, and a friendly, approachable feel. Include small illustrative details that represent the subject. The style should feel personal and inviting.",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真をベースにした丸型アイコン",
    promptFragment:
      "Create a polished, circular profile-style icon. If reference images are provided, use them as the base and apply professional-grade retouching with soft studio lighting and a clean, subtle background. The result should look like a premium contact photo.",
  },
  {
    id: "auto",
    label: "おまかせ",
    description: "連絡先の情報から最適スタイルを自動選択",
    promptFragment:
      "Automatically choose the most appropriate visual style based on the contact's nature. For businesses and organizations, prefer clean and professional designs. For schools and community groups, prefer warm and friendly illustrations. For individuals, prefer polished portrait-style icons.",
  },
];

export interface BuildIconPromptParams {
  name: string;
  style: IconStyleId;
  urlMeta?: UrlMetadata | null;
  customPrompt?: string;
}

export function buildIconPrompt({
  name,
  style,
  urlMeta,
  customPrompt,
}: BuildIconPromptParams): string {
  const selectedStyle =
    ICON_STYLES.find((s) => s.id === style) ??
    ICON_STYLES.find((s) => s.id === "auto")!;

  const contextLines: string[] = [];

  contextLines.push(
    "You are a professional icon designer for the Hide NB Studio family app.",
  );
  contextLines.push(
    "Generate a single, high-quality square icon image (512x512 pixels) suitable for use as a contact icon in phone contact lists, LINE, and messaging apps.",
  );
  contextLines.push(
    "The icon must be visually clear at small sizes (40x40 pixels) and work well in circular crop.",
  );
  contextLines.push("");

  contextLines.push(`Contact name: "${name}"`);

  if (urlMeta) {
    if (urlMeta.title) {
      contextLines.push(`Website title: "${urlMeta.title}"`);
    }
    if (urlMeta.description) {
      contextLines.push(`Website description: "${urlMeta.description}"`);
    }
  }

  contextLines.push("");
  contextLines.push(`Style: ${selectedStyle.promptFragment}`);

  if (customPrompt && customPrompt.trim().length > 0) {
    contextLines.push("");
    contextLines.push(`Additional instructions from user: ${customPrompt.trim()}`);
  }

  contextLines.push("");
  contextLines.push(
    "IMPORTANT: Output exactly one square image. Do not include any text labels, watermarks, or borders. Focus the composition so the main element fills the frame well for circular cropping.",
  );

  return contextLines.join("\n");
}
