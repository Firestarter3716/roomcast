export default function DisplaysLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
          <div className="mt-2 h-4 w-60 rounded-md bg-[var(--color-muted)]/10 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-md bg-[var(--color-muted)]/20 animate-pulse" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 animate-pulse">
            <div className="h-5 w-2/3 rounded bg-[var(--color-muted)]/20" />
            <div className="mt-2 h-4 w-1/3 rounded bg-[var(--color-muted)]/10" />
            <div className="mt-4 h-4 w-3/4 rounded bg-[var(--color-muted)]/10" />
            <div className="mt-6 h-8 w-full rounded bg-[var(--color-muted)]/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
