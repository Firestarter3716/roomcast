import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { AdminNav } from "@/shared/components/layout/AdminNav";
import { Toaster } from "@/shared/components/ui/toaster";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If no session or session has no role (stale JWT), redirect to login
  if (!session?.user || !(session.user as { role?: string }).role) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
