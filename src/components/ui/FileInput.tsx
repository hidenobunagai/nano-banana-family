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
  accept = "image/*",
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Create a synthetic event to reuse existing onChange handler
      // Note: This is a simplification. Ideally, we refactor the parent to accept File directly.
      // But for now, let's keep it simple or we might need to change parent logic deeply.
      // Actually, we can just trigger the input change manually if we want to stick to the event interface,
      // but React's input file is read-only.
      // Let's just expose the input ref and try to set files if possible or just trigger a callback if we refactored.
      // Since we didn't refactor the `onChange` signature in parent, we just guide user to click for now or
      // we can try to set the input files via DataTransfer if the browser allows (modern ones do).

      if (inputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(e.dataTransfer.files[0]);
        inputRef.current.files = dataTransfer.files;

        // Dispatch change event
        const event = new Event("change", { bubbles: true });
        inputRef.current.dispatchEvent(event);

        // Call the prop manually as a fallback/primary method
        onChange({ target: inputRef.current } as ChangeEvent<HTMLInputElement>);
      }
    }
  };

  return (
    <div className="space-y-3">
      {(label || subLabel) && (
        <div className="flex flex-col">
          {label && (
            <span className="font-semibold text-slate-200">{label}</span>
          )}
          {subLabel && (
            <span className="text-sm text-slate-400">{subLabel}</span>
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
              "relative flex flex-col items-center justify-center w-full h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer group overflow-hidden",
              isDragging
                ? "border-amber-500/80 bg-amber-500/10 scale-[1.02]"
                : "border-slate-700 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-800/40"
            )}
          >
            {/* Animated Background Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:via-amber-500/5 group-hover:to-transparent transition-all duration-500" />

            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400 group-hover:text-amber-200 transition-colors z-10">
              {isOptimizing ? (
                <Loader2 className="w-10 h-10 mb-3 animate-spin text-amber-500" />
              ) : (
                <Upload
                  className={cn(
                    "w-10 h-10 mb-3 transition-transform duration-300",
                    isDragging ? "scale-110" : "group-hover:scale-110"
                  )}
                />
              )}
              <p className="text-sm font-medium">
                {isDragging ? "Drop to upload" : "Click or drop image"}
              </p>
              <p className="text-xs text-slate-500 mt-1">JPG, PNG, WebP</p>
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
            className="relative rounded-2xl overflow-hidden border border-white/20 group shadow-lg"
          >
            <Image
              src={previewUrl}
              alt="Preview"
              width={800}
              height={600}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            {/* Glass Overlay on Hover */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <label className="cursor-pointer">
                <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95 transition-all font-medium text-sm flex items-center gap-2 shadow-xl">
                  <RefreshCw className="w-4 h-4" />
                  Change Image
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={onChange}
                />
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
