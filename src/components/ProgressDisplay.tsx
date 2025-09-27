import styles from "./ProgressDisplay.module.css";

export interface ProgressStep {
  id: string;
  label: string;
  estimatedDuration: number; // in milliseconds
}

export interface ProgressDisplayProps {
  isVisible: boolean;
  currentStep: number;
  progress: number; // 0-100
  steps: ProgressStep[];
  title?: string;
}

export function ProgressDisplay({
  isVisible,
  currentStep,
  progress,
  steps,
  title,
}: ProgressDisplayProps) {
  if (!isVisible) {
    return null;
  }

  const currentStepInfo = steps[currentStep];

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <h3 className={styles.progressTitle}>
          {title ?? "Gemini が画像を編集中..."}
        </h3>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      <div className={styles.progressInfo}>
        <div className={styles.percentage}>{Math.round(progress)}%</div>
        <div className={styles.currentStep}>
          {currentStepInfo ? currentStepInfo.label : "処理中..."}
        </div>
      </div>

      <div className={styles.stepsList}>
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`${styles.step} ${
              index < currentStep
                ? styles.stepCompleted
                : index === currentStep
                ? styles.stepActive
                : styles.stepPending
            }`}
          >
            <div className={styles.stepIndicator}>
              {index < currentStep ? "✓" : index === currentStep ? "●" : "○"}
            </div>
            <div className={styles.stepLabel}>{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
