import { Suspense } from "react";

import AuthPage from "@/pages/AuthPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Login",
  description:
    "Sign in to IntelliLib to access AI-powered discovery, real-time tracking, and your personalized library dashboard.",
  path: "/login",
  noIndex: true,
  keywords: ["library login", "member sign in", "IntelliLib access"],
});

const Page = () => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-(--page-bg)" />}>
      <div>
        <AuthPage initialMode="login" />
      </div>
    </Suspense>
  );
};

export default Page;
