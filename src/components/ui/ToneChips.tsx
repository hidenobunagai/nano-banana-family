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
          className="h-7 rounded-full border border-[var(--color-neutral-300)] px-2 text-dns-14"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
