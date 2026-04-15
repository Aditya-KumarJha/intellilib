import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Bookmark,
  BookMarked,
  BookOpen,
  ClipboardList,
  CreditCard,
  FolderOpen,
  History,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import type { UserRole } from "@/lib/authStore";

export type DashboardNavItem = {
  segment: string | null;
  label: string;
  description: string;
  icon: LucideIcon;
};

const userItems: DashboardNavItem[] = [
  {
    segment: null,
    label: "Overview",
    description: "Issued books, dues, fines, and activity at a glance.",
    icon: LayoutDashboard,
  },
  {
    segment: "search",
    label: "Smart Search",
    description: "Search by title, author, or category with live suggestions.",
    icon: Search,
  },
  {
    segment: "assistant",
    label: "AI Assistant",
    description: "Ask in natural language for books, locations, and your loans.",
    icon: MessageSquare,
  },
  {
    segment: "my-books",
    label: "My Books",
    description: "Current issues, due dates, and return status.",
    icon: BookOpen,
  },
  {
    segment: "bookmarks",
    label: "Bookmarks",
    description: "Saved titles you want to revisit quickly.",
    icon: Bookmark,
  },
  {
    segment: "reservations",
    label: "Reservations",
    description: "Reserve unavailable titles and track queue position.",
    icon: BookMarked,
  },
  {
    segment: "fines",
    label: "Fines & Payments",
    description: "Outstanding fines, pay digitally, and view receipts.",
    icon: CreditCard,
  },
  {
    segment: "notifications",
    label: "Notifications",
    description: "Due date reminders, fine alerts, and request updates.",
    icon: Bell,
  },
  {
    segment: "history",
    label: "History",
    description: "Past issues, returns, and payments.",
    icon: History,
  },
];

const librarianItems: DashboardNavItem[] = [
  {
    segment: null,
    label: "Overview",
    description: "Circulation pulse, requests, and desk shortcuts.",
    icon: LayoutDashboard,
  },
  {
    segment: "assistant",
    label: "AI Assistant",
    description: "Talk to the librarian assistant to manage inventory and requests.",
    icon: MessageSquare,
  },
  {
    segment: "catalog",
    label: "Catalog",
    description: "Add, edit, and organize books and metadata.",
    icon: FolderOpen,
  },
  {
    segment: "circulation",
    label: "Issue & Return",
    description: "Digital issue/return with real-time availability.",
    icon: ClipboardList,
  },
  {
    segment: "members",
    label: "Members",
    description: "Member profiles, roles, and account status.",
    icon: Users,
  },
  {
    segment: "requests",
    label: "Requests",
    description: "Approve reservations and extension requests.",
    icon: BookMarked,
  },
  {
    segment: "analytics",
    label: "Analytics",
    description: "Loans, turnover, and category insights.",
    icon: BarChart3,
  },
  {
    segment: "audit",
    label: "Audit Log",
    description: "Immutable trail of issues, returns, and edits.",
    icon: Shield,
  },
];

const adminItems: DashboardNavItem[] = [
  {
    segment: null,
    label: "Overview",
    description: "System health, adoption, and risk indicators.",
    icon: LayoutDashboard,
  },
  {
    segment: "users",
    label: "Users & Roles",
    description: "Admins, librarians, and members across the tenant.",
    icon: UserCog,
  },
  {
    segment: "catalog",
    label: "Books & Media",
    description: "Global catalog, covers, and Supabase storage.",
    icon: FolderOpen,
  },
  {
    segment: "circulation",
    label: "Circulation",
    description: "Policy overrides and bulk operations.",
    icon: ClipboardList,
  },
  {
    segment: "payments",
    label: "Payments",
    description: "Razorpay reconciliation and fine configuration.",
    icon: Wallet,
  },
  {
    segment: "analytics",
    label: "Reports",
    description: "Exports and executive summaries.",
    icon: LineChart,
  },
  {
    segment: "audit",
    label: "Audit & Security",
    description: "Compliance views and sensitive actions.",
    icon: Shield,
  },
  {
    segment: "settings",
    label: "System Settings",
    description: "Integrations, AI keys, and environment toggles.",
    icon: Settings,
  },
];

const NAV_BY_ROLE: Record<UserRole, DashboardNavItem[]> = {
  user: userItems,
  librarian: librarianItems,
  admin: adminItems,
};

export function getDashboardNav(role: UserRole): DashboardNavItem[] {
  return NAV_BY_ROLE[role] ?? userItems;
}

export function dashboardHref(role: UserRole, segment: string | null): string {
  if (!segment) return `/dashboard/${role}`;
  return `/dashboard/${role}/${segment}`;
}

export function getNavLinks(role: UserRole) {
  return getDashboardNav(role).map((item) => ({
    ...item,
    href: dashboardHref(role, item.segment),
  }));
}

export function isValidDashboardSection(role: UserRole, segment: string): boolean {
  return getDashboardNav(role).some((item) => item.segment === segment);
}

export function getSectionMeta(role: UserRole, segment: string): DashboardNavItem | undefined {
  return getDashboardNav(role).find((item) => item.segment === segment);
}
