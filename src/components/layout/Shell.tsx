import { Menu } from "lucide-react";
import * as React from "react";
import { Sidebar, type Mode } from "./Sidebar";

interface ShellProps {
  children: React.ReactNode;
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
  onSignOut: () => void;
}

export function Shell({
  children,
  currentMode,
  onModeChange,
  onSignOut,
}: ShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black text-slate-100">
      <Sidebar
        currentMode={currentMode}
        onModeChange={onModeChange}
        onSignOut={onSignOut}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 border-b border-white/10 bg-[#020617]/80 backdrop-blur-md z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-3 font-semibold text-lg">Hide NB Studio</span>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
