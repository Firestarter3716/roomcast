export default function RoomsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
          <div className="mt-2 h-4 w-56 rounded-md bg-[var(--color-muted)]/10 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 animate-pulse">
            <div className="h-5 w-2/3 rounded bg-[var(--color-muted)]/20" />
            <div className="mt-3 h-6 w-20 rounded-full bg-[var(--color-muted)]/10" />
            <div className="mt-4 h-4 w-3/4 rounded bg-[var(--color-muted)]/10" />
            <div className="mt-2 h-4 w-1/2 rounded bg-[var(--color-muted)]/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
