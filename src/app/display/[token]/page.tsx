import { notFound } from "next/navigation";

interface DisplayPageProps {
  params: Promise<{ token: string }>;
}

export default async function DisplayPage({ params }: DisplayPageProps) {
  const { token } = await params;

  // TODO: Fetch display config by token from database
  // For now, show a placeholder
  if (!token) {
    notFound();
  }

  return (
    <div
      className="display-shell flex items-center justify-center"
      style={{
        backgroundColor: "var(--color-background)",
        color: "var(--color-foreground)",
      }}
    >
      <div className="text-center">
        <h1 className="text-4xl font-bold">RoomCast Display</h1>
        <p className="mt-2 text-lg opacity-60">Token: {token}</p>
        <p className="mt-1 text-sm opacity-40">Display view will render here</p>
      </div>
    </div>
  );
}
