import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/server/db/prisma";

// In-memory cache for session timeout setting (5-min TTL)
let cachedTimeoutHours: number | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getSessionTimeoutHours(): Promise<number> {
  const now = Date.now();
  if (cachedTimeoutHours !== null && now < cacheExpiresAt) {
    return cachedTimeoutHours;
  }

  const settings = await prisma.systemSettings.findFirst({
    select: { sessionTimeoutHours: true },
  });

  cachedTimeoutHours = settings?.sessionTimeoutHours ?? 8;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedTimeoutHours;
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");
      const isApiAdmin = nextUrl.pathname.startsWith("/api/admin");

      if (isAdminRoute || isApiAdmin) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      // New login — stamp the issue time
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.issuedAt = Date.now();
        return token;
      }

      // Subsequent requests — check session expiry
      const timeoutHours = await getSessionTimeoutHours();
      const elapsed = Date.now() - (token.issuedAt as number);
      if (elapsed > timeoutHours * 3600 * 1000) {
        // Session expired — return empty token to force re-login
        return {} as typeof token;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
