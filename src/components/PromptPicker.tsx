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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set());

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    const entries = Object.entries(groups);

    if (!normalizedQuery) {
      return entries;
    }

    return entries
      .map(([category, prompts]) => {
        const filteredPrompts = prompts.filter((prompt) => {
          const haystack = `${prompt.label} ${prompt.prompt} ${prompt.id}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });
        return [category, filteredPrompts] as const;
      })
      .filter(([, prompts]) => prompts.length > 0);
  }, [groups, normalizedQuery]);

  const hasResults = filteredEntries.some(([, prompts]) => prompts.length > 0);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((previous) => {
      const next = new Set(previous);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const resetSearch = () => {
    setQuery("");
  };

  const getPromptPreview = (prompt: PromptOption) => {
    const condensed = prompt.prompt.replace(/\s+/g, " ").trim();
    if (condensed.length <= 120) {
      return condensed;
    }
    return `${condensed.slice(0, 120)}…`;
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
            placeholder="キーワードで絞り込む"
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

      <div className={styles.categories}>
        {hasResults ? (
          filteredEntries.map(([category, prompts]) => {
            const isCollapsed = normalizedQuery ? false : collapsedCategories.has(category);
            return (
              <section key={category} className={styles.category}>
                <button
                  type="button"
                  className={styles.categoryHeader}
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!isCollapsed}
                >
                  <span className={styles.categoryTitle}>{category}</span>
                  <span className={styles.categoryCount}>{prompts.length}</span>
                  <span
                    aria-hidden="true"
                    className={`${styles.collapseIcon} ${isCollapsed ? styles.collapseIconCollapsed : ""}`.trim()}
                  >
                    <svg viewBox="0 0 24 24" focusable="false" className={styles.collapseIconSvg}>
                      <path d="M7 10l5 5 5-5H7z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
                <div className={`${styles.options} ${isCollapsed ? styles.optionsCollapsed : ""}`.trim()}>
                  {prompts.map((prompt) => {
                    const isSelected = prompt.id === selectedPromptId;
                    return (
                      <label
                        key={prompt.id}
                        className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`.trim()}
                      >
                        <input
                          className={styles.radio}
                          type="radio"
                          name="prompt"
                          value={prompt.id}
                          checked={isSelected}
                          onChange={() => onSelect(prompt.id)}
                        />
                        <span className={styles.optionText}>
                          <span className={styles.optionLabel}>{prompt.label}</span>
                          <span className={styles.optionDescription}>{getPromptPreview(prompt)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <p className={styles.emptyState}>一致するプリセットが見つかりませんでした。</p>
        )}
      </div>
    </fieldset>
  );
}
