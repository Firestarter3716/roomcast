export default function RoomsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
            Räume
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Verwalten Sie Ihre Konferenzräume und Ressourcen
          </p>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-12">
        <p className="text-[var(--color-muted-foreground)]">
          Noch keine Räume erstellt. Erstellen Sie Ihren ersten Raum.
        </p>
      </div>
    </div>
  );
}
