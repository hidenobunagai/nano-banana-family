"use client";

import type { StarterPrompt } from "@/utils/starterPrompts";

interface StarterChipsProps {
  prompts: StarterPrompt[];
  disabled: boolean;
  onPick: (prompt: string) => void;
}

export function StarterChips({ prompts, disabled, onPick }: StarterChipsProps) {
  if (prompts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="スタータープロンプト">
      {prompts.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(p.prompt)}
          title={p.prompt}
          className="min-h-9 rounded-full border border-[var(--color-neutral-300)] bg-white px-3 text-dns-14 text-[var(--color-neutral-700)] transition-colors hover:border-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
