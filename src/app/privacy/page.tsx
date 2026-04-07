import { MarketingHeader } from "@/components/landing/marketing-header";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata = { title: "Privacy Policy — ChannelPulse" };

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Last updated: April 6, 2026</p>

        <div className="prose prose-gray mt-10 max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed">
          <h2>1. Information We Collect</h2>
          <p>
            When you create an account we collect your name, email address, and organization details.
            When you connect a sales channel (Shopify, Amazon, Etsy, TikTok Shop, or Walmart) we
            receive read-only access to orders, products, and inventory data through each
            platform&apos;s official API. We never request write access to your stores.
          </p>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>Display unified analytics, dashboards, and P&amp;L reports.</li>
            <li>Power AI Insights based on your synced channel data.</li>
            <li>Send transactional emails (alerts, weekly digests) you opt into.</li>
            <li>Improve product performance and reliability.</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>
            We do not sell or rent your personal information. We share data only with
            service providers that help operate ChannelPulse (hosting, email delivery, payment
            processing) under strict data-processing agreements.
          </p>

          <h2>4. Data Storage &amp; Security</h2>
          <p>
            All data is stored on infrastructure with encryption at rest and in transit.
            Database access is scoped with row-level security so each organization can only
            access its own data.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. If you delete your account,
            we remove all associated data within 30 days.
          </p>

          <h2>6. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at
            any time by contacting us at{" "}
            <a href="mailto:support@channelpulse.io">support@channelpulse.io</a>.
          </p>

          <h2>7. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            third-party advertising cookies.
          </p>

          <h2>8. Changes</h2>
          <p>
            We may update this policy from time to time. Material changes will be communicated
            via email or an in-app notice.
          </p>

          <h2>9. Contact</h2>
          <p>
            Questions? Reach us at{" "}
            <a href="mailto:support@channelpulse.io">support@channelpulse.io</a>.
          </p>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
