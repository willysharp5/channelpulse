"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface FooterNavLinkProps {
  href: string;
  label: string;
  className?: string;
}

export function FooterNavLink({ href, label, className }: FooterNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();

  const cls = className ?? "text-sm text-gray-500 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50";

  // For hash links on the same page, smooth-scroll without a full navigation
  if (href.startsWith("/landing#") && pathname === "/landing") {
    const hash = href.replace("/landing", "");
    return (
      <button
        type="button"
        className={cls}
        onClick={() => {
          const el = document.querySelector(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            router.push(href);
          }
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}
