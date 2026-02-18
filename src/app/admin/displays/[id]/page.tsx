import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getDisplay } from "@/features/displays/actions";
import { DisplayEditor } from "@/features/displays/components";
import { type DisplayConfig, DEFAULT_THEME, DEFAULT_BRANDING, DEFAULT_BACKGROUND, getDefaultLayoutConfig } from "@/features/displays/types";

export const dynamic = "force-dynamic";

interface EditDisplayPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDisplayPage({ params }: EditDisplayPageProps) {
  const { id } = await params;
  const display = await getDisplay(id);

  if (!display) {
    notFound();
  }

  const config = display.config as unknown as DisplayConfig | null;
  const safeConfig: DisplayConfig = {
    theme: { ...DEFAULT_THEME, ...config?.theme },
    branding: { ...DEFAULT_BRANDING, ...config?.branding },
    background: { ...DEFAULT_BACKGROUND, ...config?.background },
    layout: { ...getDefaultLayoutConfig(display.layoutType), ...config?.layout },
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/displays" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Displays
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">{display.name}</h1>
          <a href={`/display/${display.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
            <ExternalLink className="h-3 w-3" /> Open Display
          </a>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {display.layoutType.replace("_", " ")} &middot; {display.orientation.toLowerCase()}
          {display.room && ` \u00B7 ${display.room.name}`}
        </p>
      </div>
      <DisplayEditor displayId={display.id} layoutType={display.layoutType} initialConfig={safeConfig} orientation={display.orientation} roomName={display.room?.name} initialIpWhitelist={display.ipWhitelist} />
    </div>
  );
}
