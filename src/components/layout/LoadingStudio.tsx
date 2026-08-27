"use client";

import { Shell } from "@/components/layout/Shell";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * First-paint placeholder shown while the auth session resolves. It reproduces
 * the authenticated layout (Shell header + EditorLayout two-column grid) so the
 * user sees the real shape of the app immediately instead of a blank spinner.
 */
export function LoadingStudio() {
  return (
    <Shell onSignOut={() => {}} navMode="freestyle" onNavModeChange={() => {}}>
      <div className="w-full max-w-[1400px] mx-auto" role="status" aria-label="読み込み中">
        <Skeleton className="h-7 w-40 rounded-[var(--radius-sm)] mb-4 md:mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_440px] gap-6 md:gap-8 items-start w-full">
          {/* Left: input panels */}
          <div className="min-w-0 space-y-6 xl:order-1">
            <section className="bg-white border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] p-4 sm:p-6 shadow-[var(--shadow-level-1)]">
              <div className="mb-4 pb-3 border-b border-[var(--color-neutral-100)] flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-full bg-[var(--color-primary-600)] inline-block" />
                <Skeleton className="h-5 w-44" />
              </div>
              <Skeleton className="h-24 w-full" />
            </section>

            <section className="bg-white border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] p-4 sm:p-6 shadow-[var(--shadow-level-1)]">
              <div className="mb-4 pb-3 border-b border-[var(--color-neutral-100)] flex items-center gap-2.5">
                <span className="w-1 h-5 rounded-full bg-[var(--color-primary-600)] inline-block" />
                <Skeleton className="h-5 w-52" />
              </div>
              <Skeleton className="h-32 w-full" />
              <div className="mt-3 flex justify-end">
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </section>
          </div>

          {/* Right: result pane placeholder (sticky on xl, like ResultPane) */}
          <div id="result-pane" className="xl:sticky xl:top-6 xl:order-2 min-w-0">
            <div className="bg-white border border-[var(--color-neutral-300)] rounded-[var(--radius-lg)] shadow-[var(--shadow-level-1)] p-4">
              <Skeleton className="aspect-square w-full rounded-[var(--radius-lg)]" />
              <div className="mt-4 flex justify-center">
                <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
