"use client";

import { cn } from "@/components/ui/Button";

interface SkeletonProps {
  className?: string;
}

/**
 * Low-level shimmer block. Mirrors the app's neutral-100/300 palette so the
 * loading state reads as the same surface the real content will occupy.
 */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-neutral-100)]",
        "before:content-[''] before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[skeleton-shimmer_1.4s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className,
      )}
    />
  );
}
