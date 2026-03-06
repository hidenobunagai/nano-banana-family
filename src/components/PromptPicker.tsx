"use client";

import { cn } from "@/components/ui/Button";
import { PromptOption } from "@/promptPresets";
import { Check, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type PromptGroups = Record<string, PromptOption[]>;

type PromptPickerProps = {
  groups: PromptGroups;
  selectedPromptId: string;
  onSelect: (promptId: string) => void;
  legend?: string;
};

export function PromptPicker({
  groups,
  selectedPromptId,
  onSelect,
  legend = "プロンプトを選ぶ",
}: PromptPickerProps) {
  const [query, setQuery] = useState("");

  const categories = useMemo(() => Object.keys(groups), [groups]);
  const [activeTab, setActiveTab] = useState<string>(() => categories[0] || "");

  const normalizedQuery = query.trim().toLowerCase();

  const displayedPrompts = useMemo(() => {
    if (normalizedQuery) {
      const allPrompts = Object.values(groups).flat();
      return allPrompts.filter((prompt) => {
        const haystack =
          `${prompt.label} ${prompt.prompt} ${prompt.id} ${prompt.category}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }
    return groups[activeTab] || [];
  }, [groups, activeTab, normalizedQuery]);

  const resetSearch = () => setQuery("");

  const getPromptPreview = (prompt: PromptOption) => {
    const condensed = prompt.prompt.replace(/\s+/g, " ").trim();
    return condensed.length <= 100 ? condensed : `${condensed.slice(0, 100)}…`;
  };

  return (
    <fieldset className="space-y-4">
      {/* Header / Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <legend className="text-lg font-semibold text-stone-700 flex items-center gap-2">
            {legend}
          </legend>
          <div className="relative w-64 max-w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              className="w-full pl-9 pr-9 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="キーワードで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={resetSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!normalizedQuery && categories.length > 0 && (
          <div
            className="flex flex-wrap gap-2 pb-2 border-b border-stone-200"
            role="tablist"
          >
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
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                  )}
                >
                  {category}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {displayedPrompts.length > 0 ? (
          displayedPrompts.map((prompt) => {
            const isSelected = prompt.id === selectedPromptId;
            return (
              <label
                key={prompt.id}
                className={cn(
                  "relative flex gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01]",
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/50"
                      : "bg-stone-50 border-stone-200 hover:border-stone-300 hover:bg-stone-100"
                  )}
                >
                <input
                  type="radio"
                  name="prompt"
                  value={prompt.id}
                  checked={isSelected}
                  onChange={() => onSelect(prompt.id)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 transition-colors",
                    isSelected
                      ? "bg-amber-500 border-amber-500"
                      : "border-stone-300 bg-white"
                  )}
                >
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "block font-medium mb-1",
                      isSelected ? "text-amber-600" : "text-stone-700"
                    )}
                  >
                    {prompt.label}
                  </span>
                  <span className="block text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {getPromptPreview(prompt)}
                  </span>
                </div>
              </label>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-stone-400">
            一致するプリセットが見つかりませんでした。
          </div>
        )}
      </div>
    </fieldset>
  );
}
