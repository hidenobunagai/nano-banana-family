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
          {label && <span className="font-semibold text-stone-700">{label}</span>}
          {subLabel && <span className="text-sm text-stone-400">{subLabel}</span>}
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
              "relative flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer group overflow-hidden",
              isDragging
                ? "border-blue-500/80 bg-blue-500/10 scale-[1.02]"
                : "border-gray-200 hover:border-gray-300 bg-gray-100 hover:bg-gray-100",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:via-blue-500/5 group-hover:to-transparent transition-all duration-500" />

            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400 group-hover:text-blue-600 transition-colors z-10">
              {isOptimizing ? (
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-blue-500" />
              ) : (
                <Upload
                  className={cn(
                    "w-10 h-10 mb-3 transition-transform duration-300",
                    isDragging ? "scale-110" : "group-hover:scale-110",
                  )}
                />
              )}
              <p className="text-sm font-medium">
                {isDragging ? "ここにドロップ" : "クリックまたはドラッグで追加"}
              </p>
              <p className="mt-1 text-xs text-stone-400">
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
            className="relative rounded-2xl overflow-hidden border border-stone-200 group shadow-lg"
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
                <div className="px-6 py-3 bg-black/10 backdrop-blur-md rounded-full border border-black/10 text-stone-800 hover:bg-black/15 hover:scale-105 active:scale-95 transition-all font-medium text-sm flex items-center gap-2 shadow-xl">
                  <RefreshCw className="w-4 h-4" />
                  Change Image
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
