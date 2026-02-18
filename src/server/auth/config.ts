import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
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

    // --- OAuth providers (conditionally enabled via env vars) ---

    ...(process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_AUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET,
          }),
        ]
      : []),

    ...(process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
      ? [
          MicrosoftEntraId({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
          }),
        ]
      : []),

    // --- LDAP provider (placeholder) ---
    // Uncomment and install ldapjs (`npm i ldapjs @types/ldapjs`) when needed.
    // ...(process.env.LDAP_URL ? [
    //   Credentials({
    //     id: "ldap",
    //     name: "LDAP",
    //     credentials: {
    //       username: { label: "Username", type: "text" },
    //       password: { label: "Password", type: "password" },
    //     },
    //     async authorize(credentials) {
    //       if (!credentials?.username || !credentials?.password) return null;
    //       // Implement LDAP bind:
    //       // const { createClient } = await import("ldapjs");
    //       // const client = createClient({ url: process.env.LDAP_URL! });
    //       // const bindDN = `${process.env.LDAP_BIND_DN_PREFIX}${credentials.username}${process.env.LDAP_BIND_DN_SUFFIX}`;
    //       // await new Promise((resolve, reject) => {
    //       //   client.bind(bindDN, credentials.password as string, (err) => err ? reject(err) : resolve(true));
    //       // });
    //       // Search for user attributes, then upsert into local DB with VIEWER role.
    //       // Return { id, email, name, role } or null on failure.
    //       return null;
    //     },
    //   }),
    // ] : []),
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

    /**
     * signIn callback — for OAuth providers, auto-create local user on first login.
     * Credentials logins are handled in the authorize() function, so we skip them here.
     */
    async signIn({ user, account }) {
      // Credentials provider handles its own user lookup — allow through
      if (account?.provider === "credentials") return true;

      // OAuth flow: ensure a local User row exists
      if (user?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          // Auto-create with VIEWER role (safest default)
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email.split("@")[0],
              role: "VIEWER",
              // passwordHash left null — OAuth-only user
            },
          });
        }

        // Update last login
        await prisma.user.update({
          where: { email: user.email },
          data: { lastLoginAt: new Date() },
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // New login — stamp the issue time
      if (user) {
        // For OAuth logins, the user object comes from the provider and
        // lacks our local id/role. Look up from the database.
        if (account?.provider && account.provider !== "credentials") {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } else {
          token.id = user.id;
          token.role = (user as { role: string }).role;
        }
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
