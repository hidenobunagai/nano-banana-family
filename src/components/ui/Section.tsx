"use client";
import { motion } from "framer-motion";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Section({ title, children, className = "", delay = 0 }: SectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`bg-white border border-[#e5e7eb] rounded-[24px] p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`}
    >
      {title && (
        <h3 className="text-std-20 font-bold text-[#111827] mb-4 flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </motion.div>
  );
}
