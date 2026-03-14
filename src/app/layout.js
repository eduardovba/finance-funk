import { Bebas_Neue, Space_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";

const bebasNeue = Bebas_Neue({
  weight: ['400'],
  subsets: ["latin"],
  variable: '--font-bebas',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: '--font-space',
  display: 'swap',
});

export const metadata = {
  title: "Finance Funk | Personal Finance Dashboard",
  description: "Motown-inspired personal finance tracking for the modern DJ of money.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finance Funk",
  },
  icons: {
    icon: "/FF.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0B0611",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${spaceMono.variable}`}>
      <body className={`bg-midnight text-parchment antialiased font-space min-h-screen`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
