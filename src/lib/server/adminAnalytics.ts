import supabaseAdmin from "@/lib/supabaseServerClient";

type FineAmountRow = {
  amount: number | string | null;
};

type TransactionRow = {
  id: number;
  user_id: string | null;
  book_copy_id: number | null;
  status: string | null;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type BookCopyRow = {
  id: number;
  book_id: number | null;
};

type BookRow = {
  id: number;
  title: string | null;
};

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

  const unpaidFineTotal = ((finesRes.data ?? []) as FineAmountRow[]).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

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

  const transactions = txData as TransactionRow[];
  const userIds = Array.from(new Set(transactions.map((transaction) => transaction.user_id).filter(Boolean)));
  const copyIds = Array.from(new Set(transactions.map((transaction) => transaction.book_copy_id).filter(Boolean)));

  const [{ data: profiles }, { data: copies }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    copyIds.length
      ? supabaseAdmin.from("book_copies").select("id,book_id").in("id", copyIds)
      : Promise.resolve({ data: [] }),
  ]);

  const typedProfiles = (profiles ?? []) as ProfileRow[];
  const typedCopies = (copies ?? []) as BookCopyRow[];
  const bookIds = Array.from(new Set(typedCopies.map((copy) => copy.book_id).filter(Boolean)));
  const { data: books } = bookIds.length
    ? await supabaseAdmin.from("books").select("id,title").in("id", bookIds)
    : { data: [] };

  const typedBooks = (books ?? []) as BookRow[];
  const profileMap = new Map(typedProfiles.map((profile) => [profile.id, profile]));
  const copyMap = new Map(typedCopies.map((copy) => [copy.id, copy]));
  const bookMap = new Map(typedBooks.map((book) => [book.id, book]));

  return transactions.map((transaction) => {
    const copy = copyMap.get(transaction.book_copy_id ?? -1) ?? null;
    const book = copy?.book_id != null ? bookMap.get(copy.book_id) ?? null : null;
    const profile = transaction.user_id ? profileMap.get(transaction.user_id) ?? null : null;
    return {
      ...transaction,
      user_display_name: profile?.full_name ?? null,
      user_avatar: profile?.avatar_url ?? null,
      book_title: book?.title ?? null,
    };
  });
}
