import { resizeImage } from "@/utils/imageOptimization";
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UploadSlot {
  id: string;
  file: File | null;
  previewUrl: string | null;
}

function createUploadSlot(): UploadSlot {
  return { id: crypto.randomUUID(), file: null, previewUrl: null };
}

interface UseUploadSlotsOptions {
  maxSlots: number;
  initialSlots?: number;
  /** Called before a file change starts (use to clear result/error state in parent). */
  onBeforeChange?: () => void;
  /** Called with an error message when image optimization fails. */
  onFileError?: (message: string) => void;
}

export interface UseUploadSlotsReturn {
  uploads: UploadSlot[];
  activeUploads: UploadSlot[];
  isOptimizingAny: boolean;
  optimizingIds: string[];
  addUploadSlot: () => void;
  removeUploadSlot: (id: string) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>, id: string) => Promise<void>;
  resetUploads: () => void;
}

export function useUploadSlots({
  maxSlots,
  initialSlots = 0,
  onBeforeChange,
  onFileError,
}: UseUploadSlotsOptions): UseUploadSlotsReturn {
  const [uploads, setUploads] = useState<UploadSlot[]>(() =>
    Array.from({ length: initialSlots }, createUploadSlot),
  );
  const [optimizingIds, setOptimizingIds] = useState<string[]>([]);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    previewUrlsRef.current = uploads
      .map((u) => u.previewUrl)
      .filter((url): url is string => Boolean(url));
  }, [uploads]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const setOptimizing = useCallback((id: string, optimizing: boolean) => {
    setOptimizingIds((prev) => {
      if (optimizing) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }, []);

  const activeUploads = useMemo(() => uploads.filter((u) => u.file), [uploads]);
  const isOptimizingAny = optimizingIds.length > 0;

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, id: string) => {
      const file = event.target.files?.[0];
      const currentSlot = uploads.find((u) => u.id === id);
      if (!currentSlot) return;

      if (!file) {
        if (currentSlot.previewUrl) URL.revokeObjectURL(currentSlot.previewUrl);
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, file: null, previewUrl: null } : u)),
        );
        return;
      }

      onBeforeChange?.();
      setOptimizing(id, true);

      try {
        const optimized = await resizeImage(file);
        if (currentSlot.previewUrl) URL.revokeObjectURL(currentSlot.previewUrl);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, file: optimized, previewUrl: URL.createObjectURL(optimized) }
              : u,
          ),
        );
      } catch (error) {
        onFileError?.(
          error instanceof Error
            ? error.message
            : "画像の準備に失敗しました。別の画像でもう一度お試しください。",
        );
      } finally {
        setOptimizing(id, false);
      }
    },
    [uploads, onBeforeChange, onFileError, setOptimizing],
  );

  const addUploadSlot = useCallback(() => {
    if (uploads.length < maxSlots) {
      setUploads((prev) => [...prev, createUploadSlot()]);
    }
  }, [uploads.length, maxSlots]);

  const removeUploadSlot = useCallback(
    (id: string) => {
      const slot = uploads.find((u) => u.id === id);
      if (slot?.previewUrl) URL.revokeObjectURL(slot.previewUrl);
      setUploads((prev) => prev.filter((u) => u.id !== id));
      setOptimizingIds((prev) => prev.filter((item) => item !== id));
    },
    [uploads],
  );

  const resetUploads = useCallback(() => {
    uploads.forEach((u) => {
      if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
    });
    setUploads(Array.from({ length: initialSlots }, createUploadSlot));
    setOptimizingIds([]);
  }, [uploads, initialSlots]);

  return {
    uploads,
    activeUploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  };
}
