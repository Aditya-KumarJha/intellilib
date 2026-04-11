import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Delete Account",
  description:
    "Instructions for permanently deleting your IntelliLib account, exports, and saved collections.",
  path: "/delete-account",
  noIndex: true,
  keywords: ["delete account", "close account", "IntelliLib removal"],
});

const DeleteAccountPage = () => {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-28 text-black dark:text-white">
      <div className="rounded-3xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
              Account
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Delete Account</h1>
          </div>
          <div className="rounded-full border border-rose-400/40 bg-rose-100/60 px-4 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-400/20 dark:text-rose-200">
            Permanent action
          </div>
        </div>

        <p className="mt-4 text-base text-black/70 dark:text-white/70">
          We are sorry to see you go. Use the steps below to permanently remove your IntelliLib
          account.
        </p>
      </div>

      <section className="mt-10 grid gap-6 text-sm text-black/70 dark:text-white/70 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Before you delete</h2>
          <p className="mt-2">
            Download any saved collections or exports you want to keep. Deletion is permanent
            and cannot be undone.
          </p>
          <ul className="mt-4 space-y-2">
            <li>Export saved collections or research notes.</li>
            <li>Cancel active subscriptions in billing settings.</li>
            <li>Confirm access to your recovery email address.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">How to delete</h2>
          <p className="mt-2">
            Go to Settings, open Account, and choose Delete Account. Follow the on-screen
            prompts to confirm.
          </p>
          <p className="mt-4">
            If you signed up with SSO, your organization admin may need to confirm deletion.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">What happens next</h2>
          <p className="mt-2">
            We begin a deletion window to protect against accidental removal. Your data is
            removed from production systems after the hold period ends.
          </p>
          <p className="mt-4">Hold period: 14 days.</p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-semibold text-black dark:text-white">Need help?</h2>
          <p className="mt-2">
            Email support@intellilib.ai if you cannot access your account or need assistance.
          </p>
          <p className="mt-4">We respond within 1 business day.</p>
        </div>
      </section>
    </main>
  );
};

export default DeleteAccountPage;
