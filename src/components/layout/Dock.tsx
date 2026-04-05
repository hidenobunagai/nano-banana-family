"use client";

import { cn } from "@/components/ui/Button";
import type { NavMode } from "@/types/nav";
import { motion } from "framer-motion";
import { Palette, UserCircle } from "lucide-react";

export type { NavMode };

interface DockProps {
  currentMode: NavMode;
  onModeChange: (mode: NavMode) => void;
}

const MENU_ITEMS = [
  { id: "freestyle", label: "Freestyle", icon: Palette },
  { id: "icon", label: "Icon", icon: UserCircle },
] as const;

export function Dock({ currentMode, onModeChange }: DockProps) {
  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-amber-100 lg:hidden"
    >
      <div className="flex items-stretch justify-around h-16">
        {MENU_ITEMS.map((item) => (
          <NavItem
            key={item.id}
            active={currentMode === item.id}
            onClick={() => onModeChange(item.id)}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>
    </motion.nav>
  );
}

function NavItem({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-inset",
        active ? "text-amber-500" : "text-stone-400 hover:text-stone-700",
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute top-0 left-4 right-4 h-0.5 bg-amber-500 rounded-full"
        />
      )}
      <Icon className="w-5 h-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </button>
  );
}
