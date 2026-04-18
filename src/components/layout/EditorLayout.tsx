"use client";

interface EditorLayoutProps {
  children: React.ReactNode;
  resultPane: React.ReactNode;
}

export function EditorLayout({ children, resultPane }: EditorLayoutProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_480px] gap-6 xl:gap-8 items-start w-full max-w-[1400px] mx-auto">
      <div className="xl:sticky xl:top-6 xl:order-2 space-y-4 min-w-0">{resultPane}</div>
      <div className="min-w-0 space-y-6 xl:space-y-8 xl:order-1">{children}</div>
    </div>
  );
}
