import { UserForm } from "@/features/users/components";

export default function NewUserPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">
        Create User
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        Add a new user account
      </p>
      <div className="mt-6 max-w-2xl">
        <UserForm mode="create" />
      </div>
    </div>
  );
}
