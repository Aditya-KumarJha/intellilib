import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  BookCopy,
  BookMarked,
  BookOpenCheck,
  CircleSlash,
  Clock3,
  CreditCard,
  IndianRupee,
  Plus,
  RotateCcw,
  ShieldAlert,
  Timer,
  UserPlus,
  Users,
} from "lucide-react";

export type LibrarianMiniKpi = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export const librarianMiniKpis: LibrarianMiniKpi[] = [
  {
    label: "Desk queue",
    value: "42",
    icon: Activity,
  },
  {
    label: "Issues today",
    value: "186",
    icon: BookOpenCheck,
  },
  {
    label: "Returns today",
    value: "141",
    icon: RotateCcw,
  },
];

export type PriorityTone = "red" | "orange" | "yellow" | "blue";

export type ActionRequiredItem = {
  label: string;
  value: string;
  tone: PriorityTone;
  icon: LucideIcon;
};

export const actionRequiredItems: ActionRequiredItem[] = [
  {
    label: "Overdue > 7 days",
    value: "34",
    tone: "red",
    icon: AlertTriangle,
  },
  {
    label: "Pending approvals",
    value: "12",
    tone: "orange",
    icon: Users,
  },
  {
    label: "Failed transactions",
    value: "5",
    tone: "yellow",
    icon: CircleSlash,
  },
  {
    label: "Unprocessed returns",
    value: "9",
    tone: "blue",
    icon: RotateCcw,
  },
];

export type LiveActivityItem = {
  event: string;
  time: string;
  icon: LucideIcon;
};

export const liveActivityItems: LiveActivityItem[] = [
  {
    event: "Book issued -> Clean Code (Aditya)",
    time: "2 min ago",
    icon: BookOpenCheck,
  },
  {
    event: "Book returned -> System Design",
    time: "5 min ago",
    icon: RotateCcw,
  },
  {
    event: "Fine paid -> INR 120",
    time: "9 min ago",
    icon: IndianRupee,
  },
  {
    event: "New member registered",
    time: "12 min ago",
    icon: UserPlus,
  },
];

export type SnapshotItem = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export const inventorySnapshot: SnapshotItem[] = [
  {
    label: "Available books %",
    value: "82%",
    hint: "Healthy shelf coverage",
    icon: BookCopy,
  },
  {
    label: "Reserved books",
    value: "126",
    hint: "Awaiting pickup or issue",
    icon: BookMarked,
  },
  {
    label: "Low stock titles",
    value: "18",
    hint: "Needs procurement follow-up",
    icon: AlertTriangle,
  },
  {
    label: "Newly added books",
    value: "43",
    hint: "Added in last 7 days",
    icon: Plus,
  },
];

export const memberActivityInsights: SnapshotItem[] = [
  {
    label: "Active users today",
    value: "618",
    hint: "At least one issue/return",
    icon: Users,
  },
  {
    label: "New registrations",
    value: "27",
    hint: "Joined in last 24 hours",
    icon: UserPlus,
  },
  {
    label: "Top borrowers",
    value: "Aarav, Isha, Aditya",
    hint: "Highest loan volume this week",
    icon: BookOpenCheck,
  },
  {
    label: "Suspicious activity",
    value: "2 flags",
    hint: "Unusual rapid transactions",
    icon: ShieldAlert,
  },
];

export const financialSnapshot: SnapshotItem[] = [
  {
    label: "Fines collected today",
    value: "INR 3,240",
    hint: "18 successful collections",
    icon: IndianRupee,
  },
  {
    label: "Pending fines",
    value: "INR 12,880",
    hint: "Needs reminder push",
    icon: Clock3,
  },
  {
    label: "Failed payments",
    value: "7",
    hint: "Mostly timeout retries",
    icon: CreditCard,
  },
  {
    label: "Avg fine value",
    value: "INR 180",
    hint: "Across paid transactions today",
    icon: ArrowDownUp,
  },
];

export const systemEfficiencyMetrics: SnapshotItem[] = [
  {
    label: "Avg issue time",
    value: "2m 14s",
    hint: "Counter to successful issue",
    icon: Timer,
  },
  {
    label: "Avg return processing",
    value: "1m 38s",
    hint: "Scan to restock complete",
    icon: RotateCcw,
  },
  {
    label: "Queue speed",
    value: "21 req/hr",
    hint: "Current hour throughput",
    icon: Activity,
  },
  {
    label: "Turnaround time",
    value: "3h 50m",
    hint: "Request to completion median",
    icon: Clock3,
  },
];

export const miniTrends = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  loans: [84, 92, 97, 88, 106, 114, 120],
  requests: [54, 62, 57, 65, 70, 76, 81],
  fines: [190, 220, 210, 240, 260, 275, 290],
};

export type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const quickActions: QuickAction[] = [
  {
    label: "Add book",
    href: "/dashboard/librarian/catalog",
    icon: Plus,
  },
  {
    label: "Issue book",
    href: "/dashboard/librarian/circulation",
    icon: BookOpenCheck,
  },
  {
    label: "Return book",
    href: "/dashboard/librarian/circulation",
    icon: RotateCcw,
  },
  {
    label: "Add member",
    href: "/dashboard/librarian/members",
    icon: UserPlus,
  },
  {
    label: "View reports",
    href: "/dashboard/librarian/analytics",
    icon: Activity,
  },
];

export type NotificationPreview = {
  title: string;
  description: string;
};

export const notificationsPreview: NotificationPreview[] = [
  {
    title: "Pending approvals",
    description: "12 member and reservation approvals waiting for review.",
  },
  {
    title: "Reservation available",
    description: "8 books are ready for pickup and member confirmation.",
  },
  {
    title: "Payment alerts",
    description: "7 failed payments need retry or alternate payment method.",
  },
];
