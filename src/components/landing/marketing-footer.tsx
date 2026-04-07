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

const SOCIALS = [
  { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { label: "YouTube", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12z" },
  { label: "GitHub", path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
];

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
            {SOCIALS.map((social) => (
              <Link
                key={social.label}
                href="#"
                aria-label={social.label}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d={social.path} />
                </svg>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 ChannelPulse, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
