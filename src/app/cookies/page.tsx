import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "Learn how IntelliLib uses cookies to keep AI-powered library services reliable, secure, and personalized across devices.",
  path: "/cookies",
  keywords: ["cookie policy", "tracking preferences", "IntelliLib cookies"],
});

const CookiesPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 text-black dark:text-white">
      <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Legal
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Cookie Policy</h1>
          </div>
          <div className="rounded-full border border-amber-400/40 bg-amber-100/60 px-4 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">
            Updated March 29, 2026
          </div>
        </div>

        <p className="mt-4 text-base text-black/70 dark:text-white/70">
          We use cookies and similar technologies to keep IntelliLib reliable and personal.
          This page explains what we use, why we use it, and how you can manage preferences.
        </p>
      </div>

      <section className="mt-10 grid gap-6 text-sm text-black/70 dark:text-white/70 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Essential cookies</h2>
          <p className="mt-2">
            Required for authentication, security, and core functionality.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Session and login continuity.</li>
            <li>Fraud detection and security controls.</li>
            <li>Load balancing and performance stability.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Analytics cookies</h2>
          <p className="mt-2">
            Help us understand usage trends so we can improve performance and discoverability.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Feature engagement and navigation paths.</li>
            <li>Performance diagnostics and error monitoring.</li>
            <li>Experimentation and UX improvements.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Preference cookies</h2>
          <p className="mt-2">
            Remember your theme, language, and layout preferences across sessions.
          </p>
          <p className="mt-4">
            You can reset these at any time from your browser settings.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Managing cookies</h2>
          <p className="mt-2">
            You can control cookies in your browser settings. Disabling cookies may limit some
            features.
          </p>
          <p className="mt-4">Need help? Contact support@intellilib.ai.</p>
        </div>
      </section>
    </main>
  );
};

export default CookiesPage;
