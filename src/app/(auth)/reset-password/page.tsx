"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Monitor } from "lucide-react";
import { requestPasswordReset, resetPasswordWithToken } from "@/features/users/password-reset";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const hasToken = !!tokenParam && !!emailParam;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-8 flex flex-col items-center">
          <Monitor className="h-10 w-10 text-[var(--color-primary)]" />
          <h1 className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">
            {hasToken ? "New Password" : "Reset Password"}
          </h1>
        </div>
        {hasToken ? (
          <SetNewPasswordForm email={emailParam} token={tokenParam} />
        ) : (
          <RequestResetForm />
        )}
      </div>
    </div>
  );
}

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          If an account with that email exists, we sent a reset link. Check your inbox.
        </p>
        <a href="/login" className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">E-Mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20" required disabled={loading} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 disabled:opacity-50">
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
      <div className="text-center">
        <a href="/login" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">Back to login</a>
      </div>
    </form>
  );
}

function SetNewPasswordForm({ email, token }: { email: string; token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError("");
    setLoading(true);
    const result = await resetPasswordWithToken(email, token, password);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Reset failed");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-sm text-green-500">Password reset successfully!</p>
        <a href="/login" className="mt-4 inline-block text-sm text-[var(--color-primary)] hover:underline">Sign in</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">{error}</div>}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">New Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20" required disabled={loading} minLength={8} />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">Confirm Password</label>
        <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20" required disabled={loading} minLength={8} />
      </div>
      <button type="submit" disabled={loading} className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 disabled:opacity-50">
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}
