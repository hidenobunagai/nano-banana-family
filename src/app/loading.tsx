import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--color-background)]">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-600)]" />
    </main>
  );
}
