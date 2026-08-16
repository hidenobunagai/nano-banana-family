/**
 * Single source of truth for icon styles.
 * Shared by the Icon Creator UI (label/description/preview/colorClass)
 * and the server-side prompt builder (promptFragment).
 */

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
  preview: string;
  colorClass: string;
  promptFragment: string;
}

export const ICON_STYLES: IconStyle[] = [
  {
    id: "auto",
    label: "おまかせ",
    description: "情報から最適スタイルを自動選択",
    preview: "学校・教室・家族連絡先におすすめ",
    colorClass: "bg-[var(--color-primary-600)]",
    promptFragment:
      "Automatically choose the most appropriate visual style based on the contact's nature. For businesses and organizations, prefer clean and professional designs. For schools and community groups, prefer warm and friendly illustrations. For individuals, prefer polished portrait-style icons.",
  },
  {
    id: "flat-minimal",
    label: "フラット・ミニマル",
    description: "シンプルな色面とシンボル",
    preview: "見やすさ重視・通知アイコン向け",
    colorClass: "bg-[var(--color-neutral-700)]",
    promptFragment:
      "Use a flat, minimal design style with solid color fills, clean geometric shapes, and a single representative symbol or monogram. No gradients, no shadows, no textures. The palette should be limited to 2-3 harmonious colors.",
  },
  {
    id: "gradient-modern",
    label: "グラデーション",
    description: "鮮やかなグラデーション",
    preview: "明るく親しみやすい雰囲気",
    colorClass: "bg-[var(--color-secondary-600)]",
    promptFragment:
      "Use a modern gradient design style with vibrant, smooth color transitions as the background. Overlay a clean white or light-colored symbol or monogram. The gradient should feel contemporary and eye-catching, similar to popular app icons.",
  },
  {
    id: "illustrated",
    label: "イラスト風",
    description: "手描き感のある温かいスタイル",
    preview: "子ども向け・やわらかい印象に最適",
    colorClass: "bg-[var(--color-neutral-500)]",
    promptFragment:
      "Use a warm, hand-drawn illustration style with soft outlines, gentle colors, and a friendly, approachable feel. Include small illustrative details that represent the subject. The style should feel personal and inviting.",
  },
  {
    id: "photo-circle",
    label: "写真加工",
    description: "写真ベースの丸型アイコン",
    preview: "人物やロゴを活かしたいときに便利",
    colorClass: "bg-[var(--color-primary-700)]",
    promptFragment:
      "Create a polished, circular profile-style icon. If reference images are provided, use them as the base and apply professional-grade retouching with soft studio lighting and a clean, subtle background. The result should look like a premium contact photo.",
  },
];
