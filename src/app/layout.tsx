import type { Metadata } from "next";
import "@/shared/styles/globals.css";
import { Providers } from "@/shared/components/Providers";

export const metadata: Metadata = {
  title: "RoomCast - Digital Signage Calendar Platform",
  description: "Display calendar content on digital signage screens",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
