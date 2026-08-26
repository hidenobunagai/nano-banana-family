"use client";

import { Button } from "@/components/ui/Button";
import { MAX_PROMPT_LENGTH } from "@/utils/promptConstants";
import type { Ref } from "react";

interface PromptTextareaProps {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
  placeholder: string;
  ariaLabel?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  textareaClassName?: string;
  counterAlign?: "left" | "right";
}

export function PromptTextarea({
  name,
  value,
  onValueChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  disabled,
  placeholder,
  ariaLabel,
  textareaRef,
  textareaClassName = "",
  counterAlign = "left",
}: PromptTextareaProps) {
  const isTooLong = value.length > MAX_PROMPT_LENGTH;

  return (
    <>
      <div className="relative">
        <textarea
          ref={textareaRef}
          name={name}
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_PROMPT_LENGTH}
          className={`w-full rounded-[var(--radius-md)] bg-white border border-[var(--color-neutral-300)] p-4 pr-12 text-[var(--color-neutral-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30 focus:border-[var(--color-primary-500)] transition-shadow text-std-16 ${textareaClassName}`}
          aria-label={ariaLabel}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <div className="absolute right-3 bottom-3 flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onUndo}
            disabled={!canUndo || disabled}
            className="h-8 w-8 p-0"
            aria-label="元に戻す"
          >
            <span className="text-dns-15 font-bold text-[var(--color-neutral-500)]">↶</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onRedo}
            disabled={!canRedo || disabled}
            className="h-8 w-8 p-0"
            aria-label="やり直す"
          >
            <span className="text-dns-15 font-bold text-[var(--color-neutral-500)]">↷</span>
          </Button>
        </div>
      </div>
      <p
        className={`mt-2 text-dns-14 ${counterAlign === "right" ? "text-right" : ""} ${isTooLong ? "text-[var(--color-error-dark)]" : "text-[var(--color-neutral-500)]"}`}
      >
        {value.length} / {MAX_PROMPT_LENGTH}
      </p>
    </>
  );
}
