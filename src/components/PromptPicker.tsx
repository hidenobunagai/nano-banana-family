"use client";

import { useMemo, useState } from "react";

import { PromptOption } from "@/promptPresets";
import styles from "./PromptPicker.module.css";

type PromptGroups = Record<string, PromptOption[]>;

type PromptPickerProps = {
  groups: PromptGroups;
  selectedPromptId: string;
  onSelect: (promptId: string) => void;
  legend?: string;
};

export function PromptPicker({ groups, selectedPromptId, onSelect, legend = "プロンプトを選ぶ" }: PromptPickerProps) {
  const [query, setQuery] = useState("");

  const categories = useMemo(() => Object.keys(groups), [groups]);
  const [activeTab, setActiveTab] = useState<string>(() => categories[0] || "");

  const normalizedQuery = query.trim().toLowerCase();

  const displayedPrompts = useMemo(() => {
    if (normalizedQuery) {
      const allPrompts = Object.values(groups).flat();
      return allPrompts.filter((prompt) => {
        const haystack = `${prompt.label} ${prompt.prompt} ${prompt.id}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });
    }

    return groups[activeTab] || [];
  }, [groups, activeTab, normalizedQuery]);

  const resetSearch = () => {
    setQuery("");
  };

  const getPromptPreview = (prompt: PromptOption) => {
    const condensed = prompt.prompt.replace(/\s+/g, " ").trim();
    if (condensed.length <= 100) {
      return condensed;
    }
    return `${condensed.slice(0, 100)}…`;
  };

  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>{legend}</legend>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false" className={styles.searchIconSvg}>
              <path
                d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79L20 20.5 20.5 20l-5-6zM10.5 15a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"
                fill="currentColor"
              />
            </svg>
          </span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="キーワードで検索..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {query && (
          <button type="button" className={styles.clearButton} onClick={resetSearch}>
            クリア
          </button>
        )}
      </div>

      {!normalizedQuery && categories.length > 0 && (
        <div className={styles.tabs} role="tablist">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={activeTab === category}
              className={`${styles.tab} ${activeTab === category ? styles.tabActive : ""}`.trim()}
              onClick={() => setActiveTab(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {displayedPrompts.length > 0 ? (
          displayedPrompts.map((prompt) => {
            const isSelected = prompt.id === selectedPromptId;
            return (
              <label
                key={prompt.id}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`.trim()}
              >
                <input
                  className={styles.radio}
                  type="radio"
                  name="prompt"
                  value={prompt.id}
                  checked={isSelected}
                  onChange={() => onSelect(prompt.id)}
                />
                <div className={styles.cardContent}>
                  <span className={styles.cardLabel}>{prompt.label}</span>
                  <span className={styles.cardDescription}>{getPromptPreview(prompt)}</span>
                </div>
              </label>
            );
          })
        ) : (
          <p className={styles.emptyState}>一致するプリセットが見つかりませんでした。</p>
        )}
      </div>
    </fieldset>
  );
}
