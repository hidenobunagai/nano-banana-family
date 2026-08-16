/**
 * Icon prompt builder for the Icon Creator feature.
 * Constructs Gemini prompts tailored to contact-icon generation.
 */

import { ICON_STYLES, type IconStyleId } from "@/utils/iconStyles";
import type { UrlMetadata } from "./urlMetadata";

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
    ICON_STYLES.find((s) => s.id === style) ?? ICON_STYLES.find((s) => s.id === "auto")!;

  const contextLines: string[] = [];

  contextLines.push("You are a professional icon designer for the Hide NB Studio family app.");
  contextLines.push(
    "CRITICAL INSTRUCTION: You MUST preserve the exact facial features, identity, and likeness of the person in the uploaded reference image(s). The generated person MUST look 100% identical to the reference.",
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
