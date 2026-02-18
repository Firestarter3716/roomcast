import type { Metadata } from "next";
import "@/shared/styles/globals.css";
import { Providers } from "@/shared/components/Providers";
import { cookies } from "next/headers";
import { defaultLocale, isValidLocale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "RoomCast - Digital Signage Calendar Platform",
  description: "Display calendar content on digital signage screens",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale = localeCookie && isValidLocale(localeCookie) ? localeCookie : defaultLocale;
  const messages = (await import(`@/i18n/messages/${locale}.json`)).default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers locale={locale} messages={messages}>{children}</Providers>
      </body>
    </html>
  );
}
