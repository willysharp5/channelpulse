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

export const metadata: Metadata = {
  title: "ChannelPulse",
  description:
    "See all your Shopify, Amazon, Etsy, and TikTok Shop sales in one dashboard. Revenue, orders, profit and more.",
  applicationName: "ChannelPulse",
  openGraph: {
    siteName: "ChannelPulse",
    title: "ChannelPulse",
    description: "Unified multichannel analytics for e-commerce sellers.",
    url: "https://channelpulse.us",
    type: "website",
    images: [{ url: "/logo-512.png", width: 512, height: 512, alt: "ChannelPulse" }],
  },
  twitter: {
    card: "summary",
    title: "ChannelPulse",
    description: "Unified multichannel analytics for e-commerce sellers.",
    images: ["/logo-512.png"],
  },
  icons: {
    icon: [
      { url: "/logo-16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-128.png", sizes: "128x128", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
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
