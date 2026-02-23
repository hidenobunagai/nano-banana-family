"use client";

interface EditorLayoutProps {
  children: React.ReactNode;
  resultPane: React.ReactNode;
}

export function EditorLayout({ children, resultPane }: EditorLayoutProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_520px] gap-6 xl:gap-8 items-start w-full max-w-[1600px] mx-auto">
      <div className="min-w-0 space-y-6 xl:space-y-8">{children}</div>
      <div className="xl:sticky xl:top-24 space-y-4">
        {resultPane}
      </div>
    </div>
  );
}
