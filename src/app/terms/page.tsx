import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "Review the IntelliLib terms of service covering platform usage, subscriptions, and acceptable use for smart library management.",
  path: "/terms",
  keywords: ["terms of service", "platform terms", "IntelliLib terms"],
});

const TermsPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 text-black dark:text-white">
      <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Legal
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Terms of Service</h1>
          </div>
          <div className="rounded-full border border-purple-400/40 bg-purple-100/60 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-400/20 dark:text-purple-200">
            Effective March 29, 2026
          </div>
        </div>

        <p className="mt-4 text-base text-black/70 dark:text-white/70">
          These terms govern your use of IntelliLib. By creating an account or using the
          platform, you agree to the policies below. If you have questions, contact support
          before continuing.
        </p>
      </div>

      <section className="mt-10 grid gap-6 text-sm text-black/70 dark:text-white/70 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Account use</h2>
          <p className="mt-2">
            Keep your credentials secure and only use IntelliLib for lawful, authorized
            purposes. You are responsible for activity that occurs under your account.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Use strong passwords and multi-factor authentication.</li>
            <li>Notify us immediately if you suspect unauthorized access.</li>
            <li>Maintain accurate profile and billing details.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Acceptable use</h2>
          <p className="mt-2">
            Do not attempt to reverse engineer, overload, or disrupt the service. We may
            suspend access if usage threatens security or performance.
          </p>
          <ul className="mt-4 space-y-2">
            <li>No scraping, automated abuse, or credential sharing.</li>
            <li>No malware, spam, or content that violates laws.</li>
            <li>Respect rate limits and platform guidelines.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Content and IP</h2>
          <p className="mt-2">
            You retain ownership of your uploaded content. By using IntelliLib, you grant us
            permission to process your content to deliver the service and improve relevance.
          </p>
          <p className="mt-4">
            IntelliLib and its branding remain our intellectual property. Do not reuse or
            redistribute without permission.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Billing and plans</h2>
          <p className="mt-2">
            Paid subscriptions renew automatically unless canceled. Taxes and fees may apply
            based on your region.
          </p>
          <p className="mt-4">
            If we change pricing, we will notify you in advance through email or in-app alerts.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 bg-linear-to-br from-white via-white to-purple-50 p-6 text-sm text-black/70 shadow-sm dark:border-white/10 dark:from-black/70 dark:via-black/70 dark:to-purple-500/10 dark:text-white/70">
        <h2 className="text-lg font-semibold text-black dark:text-white">Changes and termination</h2>
        <p className="mt-2">
          We may update these terms with notice. Continued use after updates means you accept
          the new terms. You can stop using the service at any time and request account
          deletion from your settings.
        </p>
        <p className="mt-4">
          For questions about these terms, contact legal@intellilib.ai.
        </p>
      </section>
    </main>
  );
};

export default TermsPage;
