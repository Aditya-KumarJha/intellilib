import supabaseAdmin from "@/lib/supabaseServerClient";

export type OverviewStats = {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCount: number;
  overdueCount: number;
  waitingReservations: number;
  unpaidFineTotal: number;
};

export async function getLibraryOverviewStats(): Promise<OverviewStats> {
  const now = new Date().toISOString();

  const [booksRes, copiesRes, availableRes, issuedRes, overdueRes, reservationsRes, finesRes] =
    await Promise.all([
      supabaseAdmin.from("books").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("book_copies").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("book_copies")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .is("return_date", null),
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .is("return_date", null)
        .lt("due_date", now),
      supabaseAdmin
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting"),
      supabaseAdmin.from("fines").select("amount"),
    ]);

  const unpaidFineTotal = (finesRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

  return {
    totalBooks: Number(booksRes.count ?? 0),
    totalCopies: Number(copiesRes.count ?? 0),
    availableCopies: Number(availableRes.count ?? 0),
    issuedCount: Number(issuedRes.count ?? 0),
    overdueCount: Number(overdueRes.count ?? 0),
    waitingReservations: Number(reservationsRes.count ?? 0),
    unpaidFineTotal,
  };
}

export async function getRecentTransactions(limit = 20) {
  const { data: txData, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,book_copy_id,status,issue_date,due_date,return_date,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (txErr || !txData) return [];

  const userIds = Array.from(new Set(txData.map((t: any) => t.user_id).filter(Boolean)));
  const copyIds = Array.from(new Set(txData.map((t: any) => t.book_copy_id).filter(Boolean)));

  const [{ data: profiles }, { data: copies }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    copyIds.length
      ? supabaseAdmin.from("book_copies").select("id,book_id").in("id", copyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const bookIds = Array.from(new Set((copies ?? []).map((c: any) => c.book_id).filter(Boolean)));
  const { data: books } = bookIds.length
    ? await supabaseAdmin.from("books").select("id,title").in("id", bookIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const copyMap = new Map((copies ?? []).map((c: any) => [c.id, c]));
  const bookMap = new Map((books ?? []).map((b: any) => [b.id, b]));

  return txData.map((t: any) => {
    const copy = copyMap.get(t.book_copy_id) || null;
    const book = copy ? bookMap.get(copy.book_id) : null;
    const profile = profileMap.get(t.user_id) || null;
    return {
      ...t,
      user_display_name: profile?.full_name ?? null,
      user_avatar: profile?.avatar_url ?? null,
      book_title: book?.title ?? null,
    };
  });
}
