import { cn } from "@/components/ui/Button";
import { Film, LogOut, MessageSquare, Palette, Wand2, X } from "lucide-react";
import * as React from "react";

export type Mode = "simple" | "flipbook" | "freestyle" | "prompt";

interface SidebarProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  onSignOut: () => void;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const MENU_ITEMS: { id: Mode; label: string; icon: React.ElementType }[] = [
  { id: "simple", label: "画像編集", icon: Wand2 },
  { id: "flipbook", label: "パラパラ漫画", icon: Film },
  { id: "freestyle", label: "自由編集", icon: Palette },
  { id: "prompt", label: "プロンプト生成", icon: MessageSquare },
];

export function Sidebar({
  currentMode,
  onModeChange,
  onSignOut,
  className,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-72 bg-[#020617]/95 border-r border-white/10 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Hide NB Studio
            </h1>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentMode === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onModeChange(item.id);
                    onClose?.();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isActive
                        ? "text-amber-400"
                        : "text-slate-500 group-hover:text-slate-300"
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,133,0,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-6 border-t border-white/10">
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">サインアウト</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
