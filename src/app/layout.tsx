import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SURDI — Peta Lokasi Arsip",
  description:
    "Sistem Penelusuran Digital Arsip: peta interaktif lokasi arsip, pencarian multi-kriteria, dan manajemen pengguna (admin/user).",
  keywords: ["SURDI", "arsip", "peta", "BPS", "Indonesia"],
  authors: [{ name: "SURDI Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${notoSansJP.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
