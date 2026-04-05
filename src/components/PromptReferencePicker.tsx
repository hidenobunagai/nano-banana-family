"use client";

import { cn } from "@/components/ui/Button";
import { PROMPT_REFERENCES, type PromptReference } from "@/promptReferences";
import { Check, Search, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-labelledby={legendId}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] overflow-hidden"
      >
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-4">
            <h2 id={legendId} className="text-std-24 font-bold text-[#111827]">
              参考プロンプトから選ぶ
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-[9999px] hover:bg-[#f3f4f6] text-[#9ca3af] hover:text-[#374151] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9ca3af]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              className="w-full pl-9 pr-9 py-2.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-[20px] text-dns-14 text-[#374151] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 focus:bg-white focus:border-[#2563eb] transition-all"
              placeholder="キーワードで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={resetSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9ca3af] hover:text-[#374151] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!normalizedQuery && categories.length > 0 && (
            <div className="flex min-w-0 flex-wrap gap-2 mt-4 pb-2" role="tablist">
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
                      "px-3 py-1.5 rounded-[9999px] text-oln-14 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]",
                      isActive
                        ? "bg-[#2563eb] text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                        : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#374151]",
                    )}
                  >
                    {category}
                    <span
                      className={cn(
                        "ml-1.5 text-[10px]",
                        isActive ? "text-[#dbeafe]" : "text-[#9ca3af]",
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
              {displayedPrompts.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => handleSelect(ref)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-[20px] border border-[#e5e7eb] bg-[#f9fafb] hover:bg-[#eff6ff] hover:border-[#bfdbfe] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-[8px] bg-white border border-[#e5e7eb] flex items-center justify-center text-xs font-bold text-[#9ca3af] group-hover:text-[#2563eb] group-hover:border-[#93c5fd] transition-colors">
                    <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-oln-16 font-bold text-[#374151] group-hover:text-[#1d4ed8] transition-colors">
                        {ref.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-[9999px] bg-[#e5e7eb] text-[#6b7280] group-hover:bg-[#bfdbfe] group-hover:text-[#1d4ed8] transition-colors">
                        {ref.category}
                      </span>
                    </div>
                    <p className="text-dns-14 text-[#9ca3af] line-clamp-2 leading-relaxed">
                      {getPromptPreview(ref)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ref.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-[8px] bg-[#f3f4f6] text-[#9ca3af] group-hover:bg-[#dbeafe] group-hover:text-[#2563eb] transition-colors"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#9ca3af]">
              <p className="text-dns-14">一致するプロンプトが見つかりませんでした。</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-3 border-t border-[#e5e7eb] bg-[#f9fafb] text-dns-14 text-[#9ca3af] text-center">
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
