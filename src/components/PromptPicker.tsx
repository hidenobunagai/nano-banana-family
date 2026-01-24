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
          `${prompt.label} ${prompt.prompt} ${prompt.id}`.toLowerCase();
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
          <legend className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            {legend}
          </legend>
          <div className="relative w-64 max-w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              className="w-full pl-9 pr-9 py-2 bg-slate-900/50 border border-white/10 rounded-full text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="キーワードで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={resetSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!normalizedQuery && categories.length > 0 && (
          <div
            className="flex flex-wrap gap-2 pb-2 border-b border-white/10"
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
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
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
                      ? "bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50"
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
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
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-slate-600 bg-slate-800"
                  )}
                >
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-slate-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "block font-medium mb-1",
                      isSelected ? "text-emerald-400" : "text-slate-200"
                    )}
                  >
                    {prompt.label}
                  </span>
                  <span className="block text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {getPromptPreview(prompt)}
                  </span>
                </div>
              </label>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500">
            一致するプリセットが見つかりませんでした。
          </div>
        )}
      </div>
    </fieldset>
  );
}
