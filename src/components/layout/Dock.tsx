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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 lg:hidden"
    >
      <div className="flex items-stretch justify-around h-20">
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
        "relative flex flex-col items-center justify-center flex-1 gap-1.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset",
        active ? "text-blue-600" : "text-gray-500 hover:text-gray-900",
      )}
    >
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute top-0 left-4 right-4 h-1 bg-blue-500 rounded-full"
        />
      )}
      <Icon className="w-6 h-6" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
