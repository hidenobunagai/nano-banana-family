"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import React, { createContext, useCallback, useContext, useId, useState } from "react";

export type ToastType = "success" | "info" | "error";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
}

const defaultToastContext: ToastContextValue = {
  showToast: () => {},
  success: () => {},
  info: () => {},
  error: () => {},
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  return context ?? defaultToastContext;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]); // Keep at most 4 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, "success", duration),
    [showToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, "info", duration),
    [showToast],
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, "error", duration),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, success, info, error }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-4 sm:right-6 z-[60] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)] sm:w-auto"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const labelId = useId();

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-[var(--color-success-dark)] flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--color-primary-600)] flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[var(--color-error-dark)] flex-shrink-0" />,
  };

  const borderMap = {
    success: "border-[var(--color-success-dark)]/30",
    info: "border-[var(--color-primary-300)]",
    error: "border-[var(--color-error-dark)]/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role={toast.type === "error" ? "alert" : "status"}
      aria-labelledby={labelId}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md rounded-[var(--radius-md)] border shadow-[var(--shadow-level-3)] text-dns-14 text-[var(--color-neutral-900)] ${borderMap[toast.type]}`}
    >
      {iconMap[toast.type]}
      <p id={labelId} className="flex-1 font-medium leading-tight">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="閉じる"
        className="p-1 -mr-1 text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-700)] rounded-full hover:bg-[var(--color-neutral-100)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
