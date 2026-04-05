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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-labelledby={legendId}
        className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 id={legendId} className="text-xl font-bold text-gray-800">
              参考プロンプトから選ぶ
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"
              placeholder="キーワードで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={resetSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
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
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                    )}
                  >
                    {category}
                    <span
                      className={cn(
                        "ml-1.5 text-[10px]",
                        isActive ? "text-blue-100" : "text-gray-400",
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

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
          {displayedPrompts.length > 0 ? (
            <div className="space-y-2">
              {displayedPrompts.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => handleSelect(ref)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:text-blue-500 group-hover:border-blue-300 transition-colors">
                    <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                        {ref.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors">
                        {ref.category}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {getPromptPreview(ref)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ref.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"
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
            <div className="py-12 text-center text-gray-400">
              <p className="text-sm">一致するプロンプトが見つかりませんでした。</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
          プロンプト出典:{" "}
          <a
            href="https://github.com/PicoTrex/Awesome-Nano-Banana-images"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Awesome-Nano-Banana-images
          </a>
          （CC BY 4.0）
        </div>
      </div>
    </div>
  );
}
