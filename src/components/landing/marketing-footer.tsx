import Link from "next/link";
import Image from "next/image";

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/landing#features" },
      { label: "Orders", href: "/landing#analytics" },
      { label: "Revenue", href: "/landing#analytics" },
      { label: "P&L Reports", href: "/landing#pnl" },
      { label: "AI Insights", href: "/landing#ai-analytics" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    title: "Channels",
    links: [
      { label: "Shopify", href: "" },
      { label: "Amazon", href: "" },
      { label: "Etsy", href: "" },
      { label: "TikTok Shop", href: "" },
      { label: "Walmart Marketplace", href: "" },
    ],
  },
];

// Discord SVG path
const DISCORD_PATH = "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z";

export function MarketingFooter() {
  return (
    <footer className="bg-white dark:bg-gray-950">
      <div
        className="h-16 w-full border-y border-gray-200 dark:border-gray-800"
        style={{
          backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 5px)",
          opacity: 0.5,
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-10 pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/landing" className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="ChannelPulse" width={32} height={32} className="rounded-lg" />
              <span className="font-bold">ChannelPulse</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Unified analytics for multichannel sellers. One dashboard for all your stores.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-gray-950 dark:text-gray-50">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Link
              href="#"
              aria-label="Discord"
              className="text-gray-400 transition-colors hover:text-[#5865F2] dark:hover:text-[#5865F2]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d={DISCORD_PATH} />
              </svg>
            </Link>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 ChannelPulse, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
