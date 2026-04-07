import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-[#fafaf9]/80 backdrop-blur-lg dark:border-gray-800/60 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/landing" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="ChannelPulse" width={32} height={32} className="rounded-lg" />
          <span className="text-base font-bold tracking-tight">ChannelPulse</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400 md:flex">
          <Link href="/landing#features" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">Features</Link>
          <Link href="/landing#pricing" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">Pricing</Link>
          <Link href="/about" className="transition-colors hover:text-gray-950 dark:hover:text-gray-50">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://app.channelpulse.us/demo"
            className="hidden text-sm font-medium text-amber-700 transition-colors hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 sm:inline"
          >
            View demo
          </a>
          <a
            href="https://app.channelpulse.us/login"
            className="hidden text-sm font-medium text-gray-600 transition-colors hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50 sm:inline"
          >
            Sign in
          </a>
          <a
            href="https://app.channelpulse.us/signup"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            Get started free
          </a>
        </div>
      </div>
    </header>
  );
}
