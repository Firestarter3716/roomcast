"use client";

import { Suspense, useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Monitor } from "lucide-react";

/** SVG icon for Google */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/** SVG icon for Microsoft */
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 23 23" fill="none">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

/** Provider IDs that we render custom buttons for */
const OAUTH_PROVIDER_IDS = ["google", "microsoft-entra-id"] as const;

type OAuthProvider = {
  id: string;
  name: string;
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  // Fetch available OAuth providers on mount
  useEffect(() => {
    getProviders().then((providers) => {
      if (!providers) return;
      const oauth = Object.values(providers).filter((p) =>
        (OAUTH_PROVIDER_IDS as readonly string[]).includes(p.id)
      );
      setOauthProviders(oauth);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige Anmeldedaten");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Ein Fehler ist aufgetreten");
    } finally {
      setLoading(false);
    }
  }

  function handleOAuthSignIn(providerId: string) {
    signIn(providerId, { callbackUrl });
  }

  /** Returns the appropriate icon component for a provider */
  function providerIcon(id: string) {
    switch (id) {
      case "google":
        return <GoogleIcon className="h-5 w-5" />;
      case "microsoft-entra-id":
        return <MicrosoftIcon className="h-5 w-5" />;
      default:
        return null;
    }
  }

  /** Friendly display name for each provider */
  function providerDisplayName(provider: OAuthProvider) {
    switch (provider.id) {
      case "google":
        return "Google";
      case "microsoft-entra-id":
        return "Microsoft";
      default:
        return provider.name;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-8 flex flex-col items-center">
          <Monitor className="h-10 w-10 text-[var(--color-primary)]" />
          <h1 className="mt-4 text-2xl font-semibold text-[var(--color-foreground)]">
            RoomCast
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Digital Signage Calendar Platform
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@roomcast.local"
              className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/20"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Anmelden..." : "Anmelden"}
          </button>
          <div className="text-center pt-2">
            <a href="/reset-password" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
              Forgot password?
            </a>
          </div>
        </form>

        {/* OAuth provider buttons — only rendered when providers are configured */}
        {oauthProviders.length > 0 && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[var(--color-card)] px-2 text-[var(--color-muted-foreground)]">
                  or continue with
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {oauthProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleOAuthSignIn(provider.id)}
                  className="flex w-full items-center justify-center gap-3 rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-4 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
                >
                  {providerIcon(provider.id)}
                  Sign in with {providerDisplayName(provider)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
