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
  addFile: (file: File) => Promise<boolean>;
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
  const uploadsRef = useRef(uploads);
  useEffect(() => {
    uploadsRef.current = uploads;
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
      const currentSlot = uploadsRef.current.find((u) => u.id === id);
      if (!currentSlot) return;

      // Browsers fire change with an empty FileList when the picker is
      // cancelled; treat that as a no-op instead of wiping the current image.
      if (!file) return;

      onBeforeChange?.();
      setOptimizing(id, true);

      try {
        const optimized = await resizeImage(file);
        if (currentSlot.previewUrl) URL.revokeObjectURL(currentSlot.previewUrl);
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, file: optimized, previewUrl: URL.createObjectURL(optimized) } : u,
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
    [onBeforeChange, onFileError, setOptimizing],
  );

  const addUploadSlot = useCallback(() => {
    setUploads((prev) => (prev.length < maxSlots ? [...prev, createUploadSlot()] : prev));
  }, [maxSlots]);

  const addFile = useCallback(
    async (file: File): Promise<boolean> => {
      const currentUploads = uploadsRef.current;
      let targetSlot = currentUploads.find((u) => !u.file);
      let targetId = targetSlot?.id;

      if (!targetId) {
        if (currentUploads.length >= maxSlots) {
          onFileError?.(`参考画像は最大 ${maxSlots} 枚までです。`);
          return false;
        }
        const newSlot = createUploadSlot();
        targetId = newSlot.id;
        setUploads((prev) => [...prev, newSlot]);
      }

      onBeforeChange?.();
      setOptimizing(targetId, true);

      try {
        const optimized = await resizeImage(file);
        const previewUrl = URL.createObjectURL(optimized);
        setUploads((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, file: optimized, previewUrl } : u)),
        );
        return true;
      } catch (error) {
        onFileError?.(
          error instanceof Error
            ? error.message
            : "画像の準備に失敗しました。別の画像でもう一度お試しください。",
        );
        return false;
      } finally {
        setOptimizing(targetId, false);
      }
    },
    [maxSlots, onBeforeChange, onFileError, setOptimizing],
  );

  const removeUploadSlot = useCallback((id: string) => {
    const slot = uploadsRef.current.find((u) => u.id === id);
    if (slot?.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    setUploads((prev) => prev.filter((u) => u.id !== id));
    setOptimizingIds((prev) => prev.filter((item) => item !== id));
  }, []);

  const resetUploads = useCallback(() => {
    uploadsRef.current.forEach((u) => {
      if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
    });
    setUploads(Array.from({ length: initialSlots }, createUploadSlot));
    setOptimizingIds([]);
  }, [initialSlots]);

  return {
    uploads,
    activeUploads,
    isOptimizingAny,
    optimizingIds,
    addUploadSlot,
    addFile,
    removeUploadSlot,
    handleFileChange,
    resetUploads,
  };
}
