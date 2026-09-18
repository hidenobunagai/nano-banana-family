/**
 * Joins a prompt fragment onto an existing free-text prompt with the Japanese
 * comma the editors use. An empty or whitespace-only prompt yields the fragment
 * alone, so the separator never leads the text.
 */
export function appendPromptTag(prompt: string, tag: string): string {
  const trimmed = prompt.trim();
  return trimmed ? `${trimmed}、${tag}` : tag;
}
