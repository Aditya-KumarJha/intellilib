import AuthPage from "@/pages/AuthPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Sign Up",
  description:
    "Create your IntelliLib account to unlock AI-assisted discovery, smart search, and real-time library management tools.",
  path: "/signup",
  noIndex: true,
  keywords: ["library signup", "create account", "IntelliLib register"],
});

const Page = () => {
  return (
    <div>
      <AuthPage initialMode="signup" />
    </div>
  );
};

export default Page;
