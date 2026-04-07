import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://channelpulse.us";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ChannelPulse — Multichannel Sales Analytics",
    template: "%s | ChannelPulse",
  },
  description:
    "ChannelPulse unifies your Shopify, Amazon, Etsy, and TikTok Shop sales into one dashboard. Track revenue, orders, profit and inventory in real time.",
  applicationName: "ChannelPulse",
  keywords: [
    "multichannel analytics",
    "ecommerce dashboard",
    "Shopify analytics",
    "Amazon seller dashboard",
    "Etsy analytics",
    "TikTok Shop analytics",
    "Walmart Marketplace",
    "sales dashboard",
    "ecommerce profit tracking",
    "P&L ecommerce",
    "inventory management",
    "multichannel seller tools",
  ],
  authors: [{ name: "ChannelPulse", url: BASE_URL }],
  creator: "ChannelPulse",
  publisher: "ChannelPulse",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    siteName: "ChannelPulse",
    title: "ChannelPulse — Multichannel Sales Analytics",
    description:
      "Unify your Shopify, Amazon, Etsy, and TikTok Shop sales into one dashboard. Real-time revenue, profit, and inventory tracking.",
    url: BASE_URL,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/logo-512.png",
        width: 512,
        height: 512,
        alt: "ChannelPulse — Multichannel Sales Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChannelPulse — Multichannel Sales Analytics",
    description:
      "Unify your Shopify, Amazon, Etsy, and TikTok Shop sales into one dashboard.",
    images: ["/logo-512.png"],
    creator: "@channelpulse",
  },
  icons: {
    icon: [
      { url: "/logo-16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-128.png", sizes: "128x128", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
    other: [{ rel: "mask-icon", url: "/logo.svg" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
