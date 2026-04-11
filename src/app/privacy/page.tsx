import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read how IntelliLib collects, uses, and protects data across AI-powered library services, real-time tracking, and analytics dashboards.",
  path: "/privacy",
  keywords: ["privacy policy", "data protection", "IntelliLib privacy"],
});

const PrivacyPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 text-black dark:text-white">
      <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Legal
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Privacy Policy</h1>
          </div>
          <div className="rounded-full border border-blue-400/40 bg-blue-100/60 px-4 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-400/20 dark:text-blue-200">
            Effective March 29, 2026
          </div>
        </div>

        <p className="mt-4 text-base text-black/70 dark:text-white/70">
          IntelliLib values your privacy. This policy explains what we collect, how we use it,
          and the choices you have across the platform.
        </p>
      </div>

      <section className="mt-10 grid gap-6 text-sm text-black/70 dark:text-white/70 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Data we collect</h2>
          <p className="mt-2">
            We collect account details, usage analytics, and content you upload to power search
            and recommendations.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Identity data: name, email, organization, role.</li>
            <li>Usage data: feature interactions and performance metrics.</li>
            <li>Content data: documents, notes, and saved collections.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">How we use data</h2>
          <p className="mt-2">
            Data is used to deliver the service, improve relevance, and keep IntelliLib secure.
            We do not sell personal data.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Personalize discovery, summaries, and recommendations.</li>
            <li>Detect abuse, prevent fraud, and protect accounts.</li>
            <li>Maintain service reliability and product improvements.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Sharing and vendors</h2>
          <p className="mt-2">
            We share data with trusted vendors who help us operate IntelliLib, such as hosting,
            analytics, and payment providers.
          </p>
          <p className="mt-4">
            We require vendors to meet security and confidentiality standards.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Your choices</h2>
          <p className="mt-2">
            You can update your profile, manage notifications, or request account deletion
            at any time.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Export data from your workspace settings.</li>
            <li>Adjust cookie preferences in your browser.</li>
            <li>Request deletion through Settings &gt; Account.</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 bg-linear-to-br from-white via-white to-blue-50 p-6 text-sm text-black/70 shadow-sm dark:border-white/10 dark:from-black/70 dark:via-black/70 dark:to-blue-500/10 dark:text-white/70">
        <h2 className="text-lg font-semibold text-black dark:text-white">Contact</h2>
        <p className="mt-2">For privacy questions, email privacy@intellilib.ai.</p>
        <p className="mt-4">We respond to verified requests within 30 days.</p>
      </section>
    </main>
  );
};

export default PrivacyPage;
