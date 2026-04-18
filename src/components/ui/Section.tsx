"use client";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className = "" }: SectionProps) {
  return (
    <section
      className={`bg-white border border-[var(--color-neutral-200)] rounded-[var(--radius-lg)] p-4 sm:p-6 shadow-[var(--shadow-level-1)] ${className}`}
    >
      {title && (
        <h3 className="text-std-20 font-bold text-[var(--color-neutral-900)] mb-4 pb-3 border-b border-[var(--color-neutral-100)] flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-[var(--color-primary-600)] flex-shrink-0 inline-block" />
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
