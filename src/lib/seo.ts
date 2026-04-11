import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intellilib.ai";
const siteName = "IntelliLib";
const defaultTitle = "IntelliLib - AI-Powered Smart Library Management System";
const defaultDescription =
  "IntelliLib is an AI-powered library management platform with real-time book tracking, smart search, digital payments, and analytics for modern libraries.";
const defaultImage = "/images/hero/model-1.avif";

const baseKeywords = [
  "AI library management",
  "smart library system",
  "real-time book tracking",
  "library analytics",
  "digital fines",
  "AI assistant for libraries",
  "library dashboard",
  "Supabase realtime",
  "Next.js library platform",
  "IntelliLib",
];

type BuildMetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: defaultTitle,
    template: "%s | IntelliLib",
  },
  description: defaultDescription,
  referrer: "origin-when-cross-origin",
  keywords: baseKeywords,
  authors: [{ name: "IntelliLib" }],
  creator: "IntelliLib",
  publisher: "IntelliLib",
  category: "Technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName,
    url: siteUrl,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: defaultImage,
        width: 1200,
        height: 630,
        alt: "IntelliLib - AI-powered smart library platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const buildMetadata = ({
  title,
  description,
  path = "/",
  image,
  keywords,
  noIndex = false,
}: BuildMetadataInput): Metadata => {
  const pageImage = image ?? defaultImage;
  const url = path === "/" ? siteUrl : `${siteUrl}${path}`;

  return {
    title,
    description,
    keywords: [...baseKeywords, ...(keywords ?? [])],
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      siteName,
      url,
      title,
      description,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [pageImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
        },
  };
};

export const seoConfig = {
  siteUrl,
  siteName,
  defaultTitle,
  defaultDescription,
  defaultImage,
  baseKeywords,
};
