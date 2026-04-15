import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  ArrowRight,
  Bot,
  Bookmark,
  BookCheck,
  BookCopy,
  BookMarked,
  BookOpen,
  Brain,
  Clock3,
  CreditCard,
  IndianRupee,
  Search,
  Sparkles,
  Target,
} from "lucide-react";

export type UserStat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "violet" | "cyan" | "emerald" | "amber";
};

export const userStats: UserStat[] = [
  {
    label: "Books Issued",
    value: "4",
    hint: "3 active | 1 reserved",
    icon: BookOpen,
    tone: "violet",
  },
  {
    label: "Due This Week",
    value: "2",
    hint: "Return or renew soon",
    icon: AlarmClock,
    tone: "amber",
  },
  {
    label: "Unpaid Fines",
    value: "INR 120",
    hint: "Pay digitally in 2 taps",
    icon: CreditCard,
    tone: "emerald",
  },
  {
    label: "AI Queries (7d)",
    value: "31",
    hint: "Search + recommendations",
    icon: Bot,
    tone: "cyan",
  },
];

export type ActionRequiredItem = {
  label: string;
  value: string;
  tone: "red" | "orange" | "yellow";
};

export const actionRequiredItems: ActionRequiredItem[] = [
  { label: "Books due in 3 days", value: "2", tone: "orange" },
  { label: "Overdue books", value: "1", tone: "red" },
  { label: "Unpaid fine", value: "INR 120", tone: "yellow" },
];

export const continueReading = {
  lastOpened: {
    title: "Clean Architecture",
    due: "Apr 22",
    progress: "68% complete",
  },
  suggestedNext: {
    title: "Building Microservices",
    reason: "Based on your backend + architecture interests",
  },
};

export const aiUsage = {
  queriesToday: 8,
  topUsage: "Search & Recommendations",
  savedTime: "42 min",
};

export const readingActivity = [
  { label: "Books read this month", value: "6", icon: BookCheck },
  { label: "Avg reading duration", value: "47 min/day", icon: Clock3 },
  { label: "Completion rate", value: "78%", icon: Target },
];

export type ActivityFeedItem = {
  actor: string;
  action: string;
  time: string;
  icon: LucideIcon;
};

export const activityFeed: ActivityFeedItem[] = [
  { actor: "You", action: 'issued "Clean Code"', time: "12 min ago", icon: BookCopy },
  {
    actor: "You",
    action: 'returned "Pragmatic Programmer"',
    time: "1 hr ago",
    icon: ArrowRight,
  },
  { actor: "You", action: "paid INR 50 fine", time: "3 hrs ago", icon: IndianRupee },
  {
    actor: "You",
    action: 'reserved "System Design Interview"',
    time: "6 hrs ago",
    icon: BookMarked,
  },
];

export const smartNotifications = [
  { title: "Due reminder", description: "Clean Architecture due in 2 days." },
  { title: "Reservation available", description: "System Design Interview is ready for pickup." },
  { title: "Fine alert", description: "INR 120 unpaid fine pending for 4 days." },
];

export const quickActions = [
  { label: "Search Book", href: "/dashboard/user/search", icon: Search },
  { label: "View My Books", href: "/dashboard/user/my-books", icon: BookOpen },
  { label: "Bookmarks", href: "/dashboard/user/bookmarks", icon: Bookmark },
  { label: "Pay Fine", href: "/dashboard/user/fines", icon: CreditCard },
  { label: "Ask AI", href: "/dashboard/user/assistant", icon: Sparkles },
];

export const personalizedInsights = [
  "You prefer Backend and System Design books.",
  "Recommended next track: AI and Distributed Systems.",
];

export const aiPromptExamples = [
  "Suggest backend books under 300 pages",
  "Which book should I read after Clean Architecture?",
  "Find books similar to Designing Data-Intensive Applications",
];

export const insightBadge = {
  label: "AI-curated profile",
  icon: Brain,
};
