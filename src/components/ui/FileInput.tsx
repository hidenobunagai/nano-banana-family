"use client";
import { cn } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useRef, useState } from "react";

interface FileInputProps {
  label?: string;
  subLabel?: string;
  previewUrl: string | null;
  isOptimizing: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
}

export function FileInput({
  label,
  subLabel,
  previewUrl,
  isOptimizing,
  onChange,
  accept = "image/jpeg,image/png,image/webp",
}: FileInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0] && inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(e.dataTransfer.files[0]);
      inputRef.current.files = dataTransfer.files;
      onChange({ target: inputRef.current } as ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div>
      {(label || subLabel) && (
        <div className="flex flex-col mb-2">
          {label && (
            <span className="text-std-16 font-bold text-[var(--color-neutral-700)]">{label}</span>
          )}
          {subLabel && (
            <span className="text-dns-14 text-[var(--color-neutral-400)]">{subLabel}</span>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.label
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key="upload-placeholder"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-48 rounded-[var(--radius-lg)] border-2 border-dashed transition-all cursor-pointer group overflow-hidden",
              isDragging
                ? "border-[var(--color-primary-600)] bg-[var(--color-primary-50)] scale-[1.02]"
                : "border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)]",
            )}
          >
            <div className="flex flex-col items-center justify-center text-[var(--color-neutral-400)] group-hover:text-[var(--color-primary-600)] transition-colors z-10">
              {isOptimizing ? (
                <Loader2 className="w-8 h-8 mb-2 animate-spin text-[var(--color-primary-600)]" />
              ) : (
                <Upload
                  className={cn(
                    "w-8 h-8 mb-2 transition-transform duration-300",
                    isDragging ? "scale-110" : "group-hover:scale-110",
                  )}
                />
              )}
              <p className="text-oln-14 font-medium">
                {isDragging ? "ここにドロップ" : "クリックして追加"}
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={accept}
              onChange={onChange}
              disabled={isOptimizing}
            />
          </motion.label>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key="preview-image"
            className="relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-neutral-200)] group shadow-[var(--shadow-level-1)]"
          >
            <Image
              src={previewUrl}
              alt="Preview"
              width={800}
              height={600}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <label className="cursor-pointer">
                <div className="px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-[var(--radius-full)] text-[var(--color-neutral-900)] hover:bg-white hover:scale-105 active:scale-95 transition-all font-medium text-oln-14 flex items-center gap-2 shadow-[var(--shadow-level-2)]">
                  <RefreshCw className="w-4 h-4" />
                  画像を変更
                </div>
                <input type="file" className="hidden" accept={accept} onChange={onChange} />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
