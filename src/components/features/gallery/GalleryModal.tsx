"use client";

import { Button, cn } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  deleteFromGallery,
  loadFromGallery,
  type GalleryItem,
} from "@/utils/galleryStorage";
import { Copy, Download, Image as ImageIcon, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (item: GalleryItem) => void;
}

export function GalleryModal({ isOpen, onClose, onSelectImage }: GalleryModalProps) {
  const toast = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadFromGallery();
    setItems(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchItems();
      closeButtonRef.current?.focus();
    } else {
      setSelectedItem(null);
    }
  }, [isOpen, fetchItems]);

  // Focus trap and Escape handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedItem) {
          setSelectedItem(null);
        } else {
          onClose();
        }
        return;
      }

      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedItem, onClose]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await deleteFromGallery(id);
    if (success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      toast.success("ギャラリーから削除しました");
    }
  };

  const handleCopy = async (item: GalleryItem) => {
    try {
      const response = await fetch(`data:${item.mimeType};base64,${item.imageBase64}`);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      toast.success("画像をクリップボードにコピーしました！");
    } catch {
      toast.error("画像のコピーに失敗しました");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[var(--color-neutral-300)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-neutral-200)]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[var(--color-primary-600)]" />
            <h2 id="gallery-modal-title" className="text-std-18 font-bold text-[var(--color-neutral-900)]">
              作品ギャラリー ({items.length}件)
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-800)] hover:bg-[var(--color-neutral-100)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-[var(--color-neutral-500)]">
              読み込み中...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-std-16 text-[var(--color-neutral-700)] font-medium">
                まだ保存された画像がありません
              </p>
              <p className="text-dns-14 text-[var(--color-neutral-500)]">
                画像を生成すると、自動的にこのギャラリーに保存されます。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((item) => {
                const src = `data:${item.mimeType};base64,${item.imageBase64}`;
                const modeLabel =
                  item.mode === "freestyle"
                    ? "自由生成"
                    : item.mode === "icon"
                      ? "アイコン"
                      : "ストーリー";

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col rounded-2xl overflow-hidden border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] hover:shadow-[var(--shadow-level-2)] transition-all cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="relative aspect-square w-full bg-[var(--color-neutral-100)] overflow-hidden">
                      <Image
                        src={src}
                        alt={item.title || item.prompt || "生成画像"}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-xs">
                        {modeLabel}
                      </span>
                    </div>

                    <div className="p-2.5 flex items-center justify-between gap-1 bg-white">
                      <span className="text-xs text-[var(--color-neutral-500)] truncate">
                        {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1 rounded-full text-[var(--color-neutral-400)] hover:text-[var(--color-error-dark)] hover:bg-[var(--color-error-light)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-error-dark)]"
                        aria-label="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Item Preview Modal */}
        {selectedItem && (
          <div
            className="absolute inset-0 z-10 bg-white/95 backdrop-blur-md p-6 flex flex-col justify-between"
            onClick={() => setSelectedItem(null)}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-primary-100)] text-[var(--color-primary-700)] mb-1">
                  {selectedItem.mode === "freestyle"
                    ? "自由生成"
                    : selectedItem.mode === "icon"
                      ? "アイコン"
                      : "ストーリー"}
                </span>
                <p className="text-std-14 text-[var(--color-neutral-700)] max-w-lg line-clamp-2">
                  {selectedItem.title || selectedItem.prompt || "無題の作品"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-full text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
                aria-label="プレビューを閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex-1 my-4 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${selectedItem.mimeType};base64,${selectedItem.imageBase64}`}
                alt={selectedItem.title || selectedItem.prompt || "プレビュー"}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleCopy(selectedItem)}
                className="gap-1.5"
              >
                <Copy className="w-4 h-4" />
                コピー
              </Button>
              <a
                href={`data:${selectedItem.mimeType};base64,${selectedItem.imageBase64}`}
                download={`gallery-${selectedItem.mode}-${selectedItem.createdAt}.${selectedItem.mimeType.replace("image/", "") || "png"}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-dns-14 font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                ダウンロード
              </a>
              {onSelectImage && (
                <Button
                  size="sm"
                  onClick={() => {
                    onSelectImage(selectedItem);
                    onClose();
                  }}
                >
                  この画像を使う
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
