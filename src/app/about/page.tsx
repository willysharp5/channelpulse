import Link from "next/link";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata = { title: "About — ChannelPulse" };

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">About</div>
        <h1 className="text-4xl font-extrabold tracking-tight">We built the dashboard we always wanted.</h1>

        <p className="mt-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
          ChannelPulse started with a simple frustration: running stores on Shopify, Amazon, and Etsy meant living in three different dashboards, three different sets of numbers, and never knowing the real profit across all of them at once.
        </p>

        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
          We built ChannelPulse to fix that. One place to see every order, every channel, and your real profit after fees, shipping, and cost of goods. No spreadsheets. No switching tabs. No guessing.
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {[
            { stat: "5+", label: "Sales channels supported" },
            { stat: "2 min", label: "Average setup time" },
            { stat: "Free", label: "Plan to get started" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-3xl font-bold text-amber-500">{s.stat}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 space-y-6 text-gray-600 dark:text-gray-400 leading-relaxed">
          <h2 className="text-xl font-bold text-gray-950 dark:text-gray-50">What we believe</h2>
          <p>
            Sellers deserve to know exactly how their business is doing. Not a rough estimate, not a number that ignores platform fees or shipping costs. The real number.
          </p>
          <p>
            We also believe tools should be fast to set up and easy to understand, even if you have never used analytics software before. ChannelPulse connects to your stores in minutes and shows you what matters right away.
          </p>
          <p>
            We read-only access your store data. We never write to your stores, never share your data with advertisers, and never sell your information.
          </p>
        </div>

        <div className="mt-14 rounded-2xl bg-amber-50 p-8 dark:bg-amber-950/20">
          <p className="font-semibold text-gray-950 dark:text-gray-50">Questions or feedback?</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            We read every message.{" "}
            <a href="mailto:support@channelpulse.io" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
              support@channelpulse.io
            </a>
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
