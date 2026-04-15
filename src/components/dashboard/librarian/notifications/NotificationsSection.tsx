import NotificationsSectionClient from "./NotificationsSectionClient";
import supabaseAdmin from "@/lib/supabaseServerClient";

type NotificationRow = {
  id: number;
  type?: string | null;
  message?: string | null;
  is_read?: boolean | number | string | null;
  created_at?: string;
  metadata?: any;
};

export default async function NotificationsSection() {
  try {
    // Types that are typically relevant to librarians (reservation/return workflows, payments, issues)
    const LIBRARIAN_TYPES = [
      "reservation_update",
      "return_request",
      "overdue_review",
      "payment_verified",
      "payment_success",
      "reservation_queue",
    ];

    const typeList = LIBRARIAN_TYPES.join(",");

    // Preferred approach: use `target_role='librarian'` when present (added by migration).
    // Fallback: include broadcast rows (user_id IS NULL) or legacy type-based matches.
    // This keeps behaviour backward-compatible while moving to schema-driven targeting.
    const orFilter = `target_role.eq.librarian,type.in.(${typeList}),user_id.is.null`;

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id,type,message,is_read,created_at,user_id,target_role")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      // server-side log for debugging
      // eslint-disable-next-line no-console
      console.error("[librarian.notifications] supabaseAdmin fetch error:", error);
    }

    const rows: NotificationRow[] = Array.isArray(data) ? data : [];
    // server-side debug info
    // eslint-disable-next-line no-console
    console.info(`[librarian.notifications] fetched ${rows.length} rows`, rows.length ? rows[0] : null);

    return <NotificationsSectionClient initialRows={rows} />;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[librarian.notifications] unexpected error:", err);
    return <NotificationsSectionClient initialRows={[]} />;
  }
}
