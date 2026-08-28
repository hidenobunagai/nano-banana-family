import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-[var(--color-background)]">
      <div className="text-center space-y-6">
        <p className="text-7xl font-display font-bold text-[var(--color-neutral-200)]">404</p>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--color-neutral-900)]">
            ページが見つかりません
          </h1>
          <p className="text-sm text-[var(--color-neutral-500)]">
            移動されたか、削除された可能性があります。
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-[var(--radius-md)] bg-[var(--color-primary-600)] text-white font-medium hover:bg-[var(--color-primary-700)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-600)]"
        >
          トップに戻る
        </Link>
      </div>
    </main>
  );
}
