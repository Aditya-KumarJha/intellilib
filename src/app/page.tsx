import HomePage from "@/pages/HomePage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "IntelliLib - AI-Powered Smart Library Management System",
  description:
    "IntelliLib delivers AI-assisted discovery, real-time book tracking, digital fine payments, and analytics dashboards for modern libraries and campuses.",
  path: "/",
  keywords: [
    "AI-powered library",
    "smart search",
    "library management system",
    "library automation",
    "digital payments",
  ],
});

const page = () => {
  return (
    <div>
      <HomePage />
    </div>
  );
};

export default page;
