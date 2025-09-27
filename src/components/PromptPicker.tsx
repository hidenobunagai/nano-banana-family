import { PromptOption } from "@/promptPresets";
import styles from "./PromptPicker.module.css";

type PromptGroups = Record<string, PromptOption[]>;

type PromptPickerProps = {
  groups: PromptGroups;
  selectedPromptId: string;
  onSelect: (promptId: string) => void;
};

export function PromptPicker({ groups, selectedPromptId, onSelect }: PromptPickerProps) {
  return (
    <fieldset className={styles.root}>
      <legend className={styles.legend}>1. プロンプトを選ぶ</legend>
      <div className={styles.categories}>
        {Object.entries(groups).map(([category, prompts]) => (
          <div key={category} className={styles.category}>
            <h3 className={styles.categoryTitle}>{category}</h3>
            <div className={styles.options}>
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
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
