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
          className="h-7 rounded-full border border-[var(--color-neutral-300)] px-2 text-dns-14"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
