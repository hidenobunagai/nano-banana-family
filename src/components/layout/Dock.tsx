"use client";

import { cn } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { Palette, UserCircle, Wand2 } from "lucide-react";
import { useState } from "react";

// Re-using the Mode type here for now to avoid circular deps if Sidebar is deleted
export type NavMode = "simple" | "flipbook" | "freestyle" | "prompt" | "icon";

interface DockProps {
  currentMode: NavMode;
  onModeChange: (mode: NavMode) => void;
}

const MENU_ITEMS = [
  { id: "simple", label: "Editor", icon: Wand2 },
  { id: "freestyle", label: "Freestyle", icon: Palette },
  { id: "icon", label: "Icon", icon: UserCircle },
] as const;

export function Dock({ currentMode, onModeChange }: DockProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl ring-1 ring-white/5"
      >
        {MENU_ITEMS.map((item) => (
          <DockItem
            key={item.id}
            active={currentMode === item.id}
            onClick={() => onModeChange(item.id)}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </motion.div>
    </div>
  );
}

function DockItem({
  active,
  onClick,
  icon: Icon,
  label,
  isDanger = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  isDanger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        active
          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
          : "hover:bg-white/10 text-slate-400 hover:text-white"
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: -45, x: "-50%" }}
            exit={{ opacity: 0, y: 10, x: "-50%" }}
            className="absolute left-1/2 -top-2 px-3 py-1 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg text-xs font-semibold whitespace-nowrap text-white pointer-events-none"
          >
            {label}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900/90 border-r border-b border-white/10 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      <Icon
        className={cn(
          "w-6 h-6",
          isDanger && "text-red-400 group-hover:text-red-300"
        )}
      />

      {active && (
        <motion.div
          layoutId="dock-dot"
          className="absolute -bottom-1 w-1 h-1 rounded-full bg-white"
        />
      )}
    </button>
  );
}
