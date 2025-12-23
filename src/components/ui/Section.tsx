"use client";
import { motion } from "framer-motion";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Section({
  title,
  children,
  className = "",
  delay = 0,
}: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`glass-panel p-6 rounded-2xl ${className}`}
    >
      {title && (
        <h3 className="text-lg font-display font-semibold text-slate-200 mb-4 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </motion.div>
  );
}
