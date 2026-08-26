"use client";

interface EditorLayoutProps {
  /** Page-level heading (h2) shown above the grid. */
  title?: string;
  children: React.ReactNode;
  resultPane: React.ReactNode;
}

export function EditorLayout({ title, children, resultPane }: EditorLayoutProps) {
  return (
    <div className="w-full max-w-[1400px] mx-auto">
      {title && (
        <h2 className="text-std-24 font-bold text-[var(--color-neutral-900)] mb-4 md:mb-6">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_440px] gap-6 md:gap-8 items-start w-full">
        <div className="min-w-0 space-y-6 xl:order-1">{children}</div>
        <div id="result-pane" className="xl:sticky xl:top-6 xl:order-2 min-w-0">
          {resultPane}
        </div>
      </div>
    </div>
  );
}
