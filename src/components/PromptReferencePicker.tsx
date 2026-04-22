"use client";

import { cn } from "@/components/ui/Button";
import { PROMPT_REFERENCES, type PromptReference } from "@/promptReferences";
import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

type PromptGroups = Record<string, PromptReference[]>;

type PromptReferencePickerProps = {
  onSelect: (prompt: string) => void;
  onClose: () => void;
};

export function PromptReferencePicker({ onSelect, onClose }: PromptReferencePickerProps) {
  const [query, setQuery] = useState("");
  const legendId = useId();

  const groups = useMemo(() => {
    const g: PromptGroups = {};
    PROMPT_REFERENCES.forEach((ref) => {
      if (!g[ref.category]) g[ref.category] = [];
      g[ref.category].push(ref);
    });
    return g;
  }, []);

  const categories = useMemo(() => Object.keys(groups), [groups]);
  const [activeTab, setActiveTab] = useState<string>(() => categories[0] || "");

  const normalizedQuery = query.trim().toLowerCase();

  const displayedPrompts = useMemo(() => {
    if (normalizedQuery) {
      const allPrompts = Object.values(groups).flat();
      return allPrompts.filter((ref) => {
        const haystack =
          `${ref.title} ${ref.prompt} ${ref.tags.join(" ")} ${ref.category}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }
    return groups[activeTab] || [];
  }, [groups, activeTab, normalizedQuery]);

  const resetSearch = () => setQuery("");

  const getPromptPreview = (ref: PromptReference) => {
    const condensed = ref.prompt.replace(/\s+/g, " ").trim();
    return condensed.length <= 80 ? condensed : `${condensed.slice(0, 80)}…`;
  };

  const handleSelect = (ref: PromptReference) => {
    onSelect(ref.prompt);
    onClose();
  };

  return (
    <div className="dads-modal-overlay">
      <div className="dads-modal-backdrop" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-labelledby={legendId}
        className="dads-modal-content max-w-3xl"
      >
        <div className="flex-shrink-0 border-b border-[var(--color-neutral-200)] px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id={legendId} className="text-std-24 font-bold text-[var(--color-neutral-900)]">
              参考プロンプト
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-[var(--radius-full)] text-[var(--color-neutral-400)] transition-colors hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-neutral-400)]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] py-2.5 pl-9 pr-9 text-dns-14 text-[var(--color-neutral-700)] placeholder:text-[var(--color-neutral-400)] transition-all focus:border-[var(--color-primary-500)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/30"
              placeholder="検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={resetSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!normalizedQuery && categories.length > 0 && (
            <div className="mt-4 flex min-w-0 flex-wrap gap-2" role="tablist">
              {categories.map((category) => {
                const isActive = activeTab === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(category)}
                    className={cn(
                      "dads-chip dads-chip--interactive border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]",
                      isActive ? "dads-chip--active shadow-[var(--shadow-level-1)]" : "",
                    )}
                  >
                    {category}
                    <span
                      className={cn(
                        "ml-1.5 text-[10px]",
                        isActive ? "text-[var(--color-primary-100)]" : "text-[var(--color-neutral-400)]",
                      )}
                    >
                      {groups[category].length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {displayedPrompts.length > 0 ? (
            <div className="space-y-2">
              {displayedPrompts.map((ref, index) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => handleSelect(ref)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-4 text-left transition-colors hover:border-[var(--color-primary-200)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-neutral-200)] bg-white text-dns-14 font-bold text-[var(--color-neutral-400)]">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-oln-16 font-bold text-[var(--color-neutral-800)]">
                          {ref.title}
                        </span>
                        <span className="rounded-[var(--radius-sm)] bg-[var(--color-neutral-100)] px-2 py-1 text-[10px] text-[var(--color-neutral-500)]">
                          {ref.category}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-dns-14 leading-relaxed text-[var(--color-neutral-500)]">
                        {getPromptPreview(ref)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ref.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[var(--radius-sm)] bg-[var(--color-neutral-100)] px-2 py-1 text-[10px] text-[var(--color-neutral-400)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[var(--color-neutral-400)]">
              <p className="text-dns-14">一致するプロンプトが見つかりません。</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-6 py-3 text-center text-dns-14 text-[var(--color-neutral-400)]">
          プロンプト出典:{" "}
          <a
            href="https://github.com/PicoTrex/Awesome-Nano-Banana-images"
            target="_blank"
            rel="noopener noreferrer"
          >
            Awesome-Nano-Banana-images
          </a>
          （CC BY 4.0）
        </div>
      </div>
    </div>
  );
}
