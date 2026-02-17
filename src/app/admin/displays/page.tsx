import Link from "next/link";
import { Plus } from "lucide-react";
import { getDisplays } from "@/features/displays/actions";
import { DisplayList } from "@/features/displays/components";

export const dynamic = "force-dynamic";

export default async function DisplaysPage() {
  const displays = await getDisplays();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Displays</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Configure your digital signage displays</p>
        </div>
        <Link href="/admin/displays/new" className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] transition-colors">
          <Plus className="h-4 w-4" /> New Display
        </Link>
      </div>
      <DisplayList displays={displays} />
    </div>
  );
}
