"use client";

interface EditorLayoutProps {
  children: React.ReactNode;
  resultPane: React.ReactNode;
}

export function EditorLayout({ children, resultPane }: EditorLayoutProps) {
  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start w-full max-w-[1600px] mx-auto">
      <div className="w-full xl:flex-1 min-w-0 space-y-8">{children}</div>
      <div className="w-full xl:w-[520px] shrink-0 sticky top-8">
        {resultPane}
      </div>
    </div>
  );
}
