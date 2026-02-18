export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-20 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
      </div>
      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-16 rounded bg-[var(--color-muted)]/20 animate-pulse" />
            ))}
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-8 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
            <div className="h-4 w-24 rounded bg-[var(--color-muted)]/10 animate-pulse" />
            <div className="h-4 w-36 rounded bg-[var(--color-muted)]/10 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-[var(--color-muted)]/10 animate-pulse" />
            <div className="h-4 w-20 rounded bg-[var(--color-muted)]/10 animate-pulse" />
            <div className="h-4 w-16 rounded bg-[var(--color-muted)]/10 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
