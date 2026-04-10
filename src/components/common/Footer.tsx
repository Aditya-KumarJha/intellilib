import Link from "next/link";

const footerLinks = {
  legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "Delete Account", href: "/delete-account" },
  ],
};

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-black/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.2fr_0.9fr_0.9fr_1fr]">
        <div className="space-y-4">
          <div className="text-2xl font-bold tracking-wide text-black dark:text-white">
            Intelli<span className="text-purple-400">Lib</span>
          </div>
          <p className="text-sm leading-relaxed text-black/70 dark:text-white/70">
            A curated, AI-assisted library for discovery, insight, and impact. Keep the
            knowledge you trust and the ideas that move your work forward.
          </p>
          <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            <div className="font-semibold text-black dark:text-white">Support</div>
            <div className="mt-2 space-y-1">
              <a className="block hover:text-black dark:hover:text-white" href="mailto:support@intellilib.ai">
                support@intellilib.ai
              </a>
              <a className="block hover:text-black dark:hover:text-white" href="tel:+14085550129">
                +1 (408) 555-0129
              </a>
              <div>Mon to Fri, 9am to 6pm PST</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="text-base font-semibold text-black dark:text-white">Product</div>
          <div className="space-y-2 text-black/70 dark:text-white/70">
            <Link className="block hover:text-black dark:hover:text-white" href="/">
              Home
            </Link>
            <div>AI Smart Discovery</div>
            <div>Knowledge Collections</div>
            <div>Research Workspaces</div>
            <div>Integrations</div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="text-base font-semibold text-black dark:text-white">Company</div>
          <div className="space-y-2 text-black/70 dark:text-white/70">
            <div>About IntelliLib</div>
            <div>Careers</div>
            <div>Press Kit</div>
            <div>Contact Sales</div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="text-base font-semibold text-black dark:text-white">Legal</div>
          <div className="space-y-2 text-black/70 dark:text-white/70">
            {footerLinks.legal.map((item) => (
              <Link key={item.href} className="block hover:text-black dark:hover:text-white" href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-purple-400/40 bg-linear-to-br from-purple-100/70 via-white to-white px-4 py-3 text-xs text-black/70 dark:border-purple-400/40 dark:from-purple-500/20 dark:via-black/40 dark:to-black/70 dark:text-white/70">
            221B Crescent Ave, San Francisco, CA 94107
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-6 py-6 text-xs text-black/60 dark:text-white/60 md:flex-row md:items-center">
          <div>Copyright {year} IntelliLib. All rights reserved.</div>
          <div className="flex flex-wrap gap-4">
            <div>Security</div>
            <div>Compliance</div>
            <div>Accessibility</div>
            <div>Status</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
