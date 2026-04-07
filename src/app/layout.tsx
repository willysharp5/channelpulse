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
  title: "ChannelPulse | Multichannel Sales Analytics",
  description:
    "See all your Shopify, Amazon, eBay, and Etsy sales in one beautiful dashboard. Revenue, orders, profit & more.",
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
