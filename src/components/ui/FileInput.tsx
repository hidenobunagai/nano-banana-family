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
    <div className="space-y-3">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && <span className="text-std-16 font-bold text-[#374151]">{label}</span>}
          {subLabel && <span className="text-dns-14 text-[#9ca3af]">{subLabel}</span>}
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
              "relative flex flex-col items-center justify-center w-full h-48 rounded-[24px] border-2 border-dashed transition-all cursor-pointer group overflow-hidden",
              isDragging
                ? "border-[#2563eb] bg-[#eff6ff] scale-[1.02]"
                : "border-[#e5e7eb] hover:border-[#d1d5db] bg-[#f9fafb]",
            )}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-[#9ca3af] group-hover:text-[#2563eb] transition-colors z-10">
              {isOptimizing ? (
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-[#2563eb]" />
              ) : (
                <Upload
                  className={cn(
                    "w-10 h-10 mb-3 transition-transform duration-300",
                    isDragging ? "scale-110" : "group-hover:scale-110",
                  )}
                />
              )}
              <p className="text-oln-16 font-medium">
                {isDragging ? "ここにドロップ" : "クリックまたはドラッグで追加"}
              </p>
              <p className="mt-1 text-dns-14 text-[#9ca3af]">
                {isOptimizing
                  ? "画像を圧縮して送信しやすいサイズに整えています…"
                  : "JPG / PNG / WebP に対応。送信前に自動で最適化します。"}
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
            className="relative rounded-[24px] overflow-hidden border border-[#e5e7eb] group shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
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
                <div className="px-6 py-3 bg-black/10 backdrop-blur-md rounded-[9999px] border border-black/10 text-[#111827] hover:bg-black/15 hover:scale-105 active:scale-95 transition-all font-medium text-oln-14 flex items-center gap-2 shadow-[0_20px_25px_rgba(0,0,0,0.1)]">
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
