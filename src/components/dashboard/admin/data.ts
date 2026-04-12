import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BookCheck,
  BookCopy,
  BookOpen,
  Bot,
  Clock3,
  CreditCard,
  Gauge,
  IndianRupee,
  Layers,
  Repeat,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

export type ActivityMetric = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "violet" | "cyan" | "emerald" | "amber";
};

export const activityMetrics: ActivityMetric[] = [
  {
    label: "Books Issued Today",
    value: "184",
    hint: "+14% vs yesterday",
    icon: BookOpen,
    tone: "violet",
  },
  {
    label: "Returns Today",
    value: "149",
    hint: "31 returned before due date",
    icon: Repeat,
    tone: "cyan",
  },
  {
    label: "Overdue Books",
    value: "63",
    hint: "19 are overdue by 7+ days",
    icon: Clock3,
    tone: "amber",
  },
  {
    label: "Active Users (24h)",
    value: "1,248",
    hint: "Users with at least one action",
    icon: Users,
    tone: "emerald",
  },
];

export const usageTrend = {
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  issues: [82, 94, 88, 102, 121, 110, 126],
  aiQueries: [124, 148, 167, 159, 196, 213, 228],
  fineCollection: [340, 420, 390, 510, 620, 700, 760],
};

export type AiMetric = {
  label: string;
  value: string;
  subtext: string;
  icon: LucideIcon;
};

export const aiMetrics: AiMetric[] = [
  {
    label: "AI Queries Today",
    value: "2,483",
    subtext: "Peak usage at 4:30 PM",
    icon: Bot,
  },
  {
    label: "Top Query Type",
    value: "Book Search",
    subtext: "41% of all AI prompts",
    icon: Sparkles,
  },
  {
    label: "Avg Response Time",
    value: "0.84s",
    subtext: "P95 at 1.3s",
    icon: Gauge,
  },
  {
    label: "AI-assisted Actions",
    value: "72%",
    subtext: "Across issue and discovery flows",
    icon: Activity,
  },
];

export const inventoryHealth = {
  availablePercent: 78,
  reservedBooks: 426,
  lowStockCategories: ["Cybersecurity", "Law", "Biographies"],
  mostIssuedCategory: "Computer Science",
};

export const financialSnapshot = {
  finesToday: "INR 6,280",
  finesMonth: "INR 1,72,460",
  pendingPayments: "INR 23,900",
  failedTransactions: 11,
  averageFinePerUser: "INR 124",
};

export type AlertItem = {
  label: string;
  count: number;
  tone: "red" | "orange" | "yellow" | "blue";
  icon: LucideIcon;
  detail: string;
};

export const alerts: AlertItem[] = [
  {
    label: "Books overdue > 7 days",
    count: 19,
    tone: "red",
    icon: AlertTriangle,
    detail: "Escalation queue requires librarian follow-up.",
  },
  {
    label: "Payment failures",
    count: 11,
    tone: "orange",
    icon: CreditCard,
    detail: "Most failures are UPI timeout retries.",
  },
  {
    label: "Pending approvals",
    count: 7,
    tone: "yellow",
    icon: UserCheck,
    detail: "New borrower accounts pending KYC.",
  },
  {
    label: "System warnings",
    count: 3,
    tone: "blue",
    icon: ShieldAlert,
    detail: "Webhook latency spikes detected.",
  },
];

export const userInsights = {
  newUsersToday: 38,
  activeUsers: 1248,
  inactiveUsers: 412,
  topBorrowers: ["Aditya", "Riya", "Aman"],
  suspendedUsers: 6,
};

export type RecentActivity = {
  actor: string;
  action: string;
  time: string;
  icon: LucideIcon;
};

export const recentActivities: RecentActivity[] = [
  {
    actor: "Aditya",
    action: 'issued "Clean Code"',
    time: "2 min ago",
    icon: BookCheck,
  },
  {
    actor: "Riya",
    action: "paid INR 120 fine",
    time: "8 min ago",
    icon: Wallet,
  },
  {
    actor: "Inventory",
    action: "marked 9 titles low stock",
    time: "42 min ago",
    icon: Layers,
  },
  {
    actor: "Admin",
    action: "reviewed suspension appeals",
    time: "1 hr ago",
    icon: UserCog,
  },
];

export const miniKpis = [
  {
    label: "Catalog size",
    value: "18.4k",
    icon: BookCopy,
  },
  {
    label: "Overdue ratio",
    value: "3.2%",
    icon: AlertTriangle,
  },
  {
    label: "Collection velocity",
    value: "INR 760/day",
    icon: IndianRupee,
  },
];
