"use client";

import { FileInput, FileInputLabel } from "@/components/ui/FileInput";
import { type UploadSlot } from "@/hooks/useUploadSlots";
import { cn } from "@/components/ui/Button";
import { X } from "lucide-react";
import type { ChangeEvent } from "react";

export interface ImageUploadGridProps {
  uploads: UploadSlot[];
  maxUploads: number;
  optimizingIds?: string[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>, slotId: string) => void;
  onRemoveSlot: (slotId: string) => void;
  onAddSlot: () => void;
  labelPrefix?: string;
  gridClassName?: string;
  addButtonHeight?: "default" | "compact";
}

export function ImageUploadGrid({
  uploads,
  maxUploads,
  optimizingIds = [],
  onFileChange,
  onRemoveSlot,
  onAddSlot,
  labelPrefix = "参考画像",
  gridClassName = "grid grid-cols-1 md:grid-cols-2 gap-4",
  addButtonHeight = "default",
}: ImageUploadGridProps) {
  const canAdd = uploads.length < maxUploads;
  const remainingCount = maxUploads - uploads.length;

  return (
    <div className={gridClassName}>
      {uploads.map((slot, index) => (
        <div key={slot.id} className="relative group">
          <FileInput
            subLabel={`${labelPrefix} ${index + 1}`}
            previewUrl={slot.previewUrl}
            isOptimizing={optimizingIds.includes(slot.id)}
            onChange={(event) => onFileChange(event, slot.id)}
          />
          {uploads.length > 1 && (
            <button
              type="button"
              onClick={() => onRemoveSlot(slot.id)}
              aria-label={`${labelPrefix} ${index + 1} を削除`}
              className="absolute top-2 right-2 rounded-[var(--radius-full)] bg-[var(--color-error-dark)]/90 p-1.5 text-white shadow-[var(--shadow-level-1)] transition-colors hover:bg-[var(--color-error-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error-dark)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {canAdd && (
        <div className="flex flex-col">
          {addButtonHeight === "default" && (
            <div aria-hidden="true" className="invisible select-none">
              <FileInputLabel subLabel={`${labelPrefix} ${uploads.length + 1}`} />
            </div>
          )}
          <button
            type="button"
            onClick={onAddSlot}
            className={cn(
              "w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-neutral-300)] bg-white text-[var(--color-neutral-500)] transition-colors hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)] flex flex-col items-center justify-center",
              addButtonHeight === "compact" ? "h-20" : "h-48",
            )}
          >
            <span className={addButtonHeight === "compact" ? "text-2xl" : "block text-3xl"}>+</span>
            <span className="mt-1 block text-oln-14 font-medium">
              画像を追加（あと {remainingCount} 枚）
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
