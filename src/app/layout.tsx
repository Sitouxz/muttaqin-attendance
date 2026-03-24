import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Santunan Emas",
  description:
    "Sistem kehadiran komuniti Santunan Emas / Santunan Emas community attendance system",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Santunan Emas",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ms"
      className={`${plusJakartaSans.variable} ${inter.variable}`}
    >
      <head>
        <meta name="theme-color" content="#173d35" />
      </head>
      <body className="antialiased">
        <OfflineBanner />
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
