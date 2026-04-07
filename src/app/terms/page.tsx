import Link from "next/link";
import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata = {
  title: "Terms of Service",
  description: "ChannelPulse terms of service — the rules and agreements governing use of the platform.",
  alternates: { canonical: "https://channelpulse.us/terms" },
  robots: { index: true, follow: false },
};

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: April 6, 2026</p>

        <div className="prose prose-gray mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed">
          <h2>1. Acceptance</h2>
          <p>
            By accessing or using ChannelPulse (&ldquo;the Service&rdquo;) you agree to be bound by
            these Terms. If you do not agree, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            ChannelPulse provides multichannel e-commerce analytics by connecting to your
            Shopify, Amazon, Etsy, TikTok Shop, and Walmart accounts via read-only API
            integrations. We aggregate orders, products, and inventory data into dashboards,
            P&amp;L reports, and AI-powered insights.
          </p>

          <h2>3. Accounts</h2>
          <p>
            You must provide accurate information when creating an account. You are responsible
            for maintaining the security of your credentials and for all activity under your
            account.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any applicable law or regulation.</li>
            <li>Reverse-engineer, decompile, or disassemble the Service.</li>
            <li>Use the Service to transmit malicious software.</li>
            <li>Attempt to gain unauthorized access to other accounts or systems.</li>
          </ul>

          <h2>5. Billing &amp; Cancellation</h2>
          <p>
            Paid plans are billed monthly via Stripe. You may cancel at any time from
            Settings then Billing. Cancellation takes effect at the end of the current
            billing period. Refunds are not provided for partial months.
          </p>

          <h2>6. Data &amp; Privacy</h2>
          <p>
            Your use of the Service is also governed by our{" "}
            <Link href="/privacy" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400">
              Privacy Policy
            </Link>
            . We access your marketplace data in read-only mode and never modify your store data.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            All content, trademarks, and code comprising the Service are owned by ChannelPulse,
            Inc. Your channel data remains your property.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, ChannelPulse shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Service.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your access if you violate these Terms. Upon termination
            your data will be deleted in accordance with our Privacy Policy.
          </p>

          <h2>10. Changes</h2>
          <p>
            We may revise these Terms at any time. Continued use after changes constitutes
            acceptance. Material changes will be communicated via email.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions? You can reach us through your account settings.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
