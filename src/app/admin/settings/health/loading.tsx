export default function HealthLoading() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-[var(--color-muted)]/20" />
              <div className="h-5 w-5 rounded bg-[var(--color-muted)]/20" />
            </div>
            <div className="mt-2 h-8 w-12 rounded bg-[var(--color-muted)]/20" />
          </div>
        ))}
      </div>
    </div>
  );
}
