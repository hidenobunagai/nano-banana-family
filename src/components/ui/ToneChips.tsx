"use client";

import type { TonePrompt } from "@/utils/tonePrompts";

interface ToneChipsProps {
  tones: TonePrompt[];
  disabled: boolean;
  onPick: (suffix: string) => void;
}

export function ToneChips({ tones, disabled, onPick }: ToneChipsProps) {
  if (tones.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="トーン">
      <span className="text-oln-14 text-[var(--color-neutral-500)]">トーン:</span>
      {tones.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(t.suffix)}
          title={t.suffix}
          className="min-h-9 rounded-full border border-[var(--color-neutral-300)] bg-white px-3 text-dns-14 text-[var(--color-neutral-700)] transition-colors hover:border-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
