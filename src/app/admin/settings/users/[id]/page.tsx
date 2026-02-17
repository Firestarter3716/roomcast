import { notFound } from "next/navigation";
import { getUser } from "@/features/users/actions";
import { UserForm } from "@/features/users/components";

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        Edit User
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Update user account details
      </p>
      <div className="mt-6 max-w-2xl">
        <UserForm
          mode="edit"
          initialData={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }}
        />
      </div>
    </div>
  );
}
