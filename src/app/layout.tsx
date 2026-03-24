import { Bebas_Neue, Space_Mono, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Providers from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

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
    icon: "/logos/FF Star Favcon.png",
    apple: "/logos/FF Star.png",
  },
};

export const viewport = {
  themeColor: "#0B0611",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable} ${spaceMono.variable}`}>
      <body className={`bg-midnight text-parchment antialiased font-sans min-h-screen`}>
        <a href="#main-scroll" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-[#D4AF37] focus:text-[#0B0611] focus:font-bold focus:text-sm focus:font-space">
            Skip to content
        </a>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }`}
        </Script>
      </body>
    </html>
  );
}
