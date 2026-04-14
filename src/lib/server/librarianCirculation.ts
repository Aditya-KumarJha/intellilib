import supabaseAdmin from "@/lib/supabaseServerClient";

type ProfileLiteRow = {
  id: string;
  full_name: string | null;
  status?: string | null;
};

type BookLiteRow = {
  id: number;
  title: string | null;
  author?: string | null;
  available_copies?: number | null;
};

type TxLookupRow = {
  id: number;
  due_date: string | null;
  book_copy_id: number | null;
};

type CopyLookupRow = {
  id: number;
  book_id: number;
};

type PendingRequestRow = {
  id: number;
  transaction_id: number;
  user_id: string;
  requested_at: string | null;
};

type TxRow = {
  id: number;
  user_id: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  fine_amount: number | null;
  book_copy_id: number | null;
};

export type CirculationSummary = {
  issuedToday: number;
  returnedToday: number;
  overdueOpen: number;
  pendingReturns: number;
  availablePhysicalCopies: number;
};

export type DeskMember = {
  id: string;
  name: string;
  status: string | null;
};

export type DeskBook = {
  id: number;
  title: string;
  author: string;
  availableCopies: number;
};

export type PendingReturnRequest = {
  id: number;
  transactionId: number;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string | null;
  bookTitle: string;
  dueDate: string | null;
};

export type CirculationRow = {
  id: number;
  userId: string;
  userName: string;
  bookTitle: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  fineAmount: number;
};

function startOfDayIso() {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dayStart.toISOString();
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function getCirculationSummary(): Promise<CirculationSummary> {
  const nowIso = new Date().toISOString();
  const todayIso = startOfDayIso();

  const [issuedTodayRes, returnedTodayRes, overdueOpenRes, pendingReturnsRes, availableCopiesRes] =
    await Promise.all([
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .gte("issue_date", todayIso),
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .not("return_date", "is", null)
        .gte("return_date", todayIso),
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .is("return_date", null)
        .lt("due_date", nowIso),
      supabaseAdmin
        .from("return_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("book_copies")
        .select("id", { count: "exact", head: true })
        .eq("status", "available")
        .eq("type", "physical"),
    ]);

  return {
    issuedToday: Number(issuedTodayRes.count ?? 0),
    returnedToday: Number(returnedTodayRes.count ?? 0),
    overdueOpen: Number(overdueOpenRes.count ?? 0),
    pendingReturns: Number(pendingReturnsRes.count ?? 0),
    availablePhysicalCopies: Number(availableCopiesRes.count ?? 0),
  };
}

export async function getDeskSeedData(): Promise<{ members: DeskMember[]; books: DeskBook[] }> {
  const [membersRes, booksRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,full_name,status")
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(300),
    supabaseAdmin
      .from("books")
      .select("id,title,author,available_copies,type")
      .in("type", ["physical", "both"])
      .gt("available_copies", 0)
      .order("available_copies", { ascending: false })
      .limit(300),
  ]);

  const memberRows = (membersRes.data ?? []) as ProfileLiteRow[];
  const members = memberRows.map((row) => ({
    id: String(row.id),
    name: normalizeName(row.full_name, `User ${String(row.id).slice(0, 8)}`),
    status: row.status ?? null,
  }));

  const bookRows = (booksRes.data ?? []) as BookLiteRow[];
  const books = bookRows.map((row) => ({
    id: Number(row.id),
    title: normalizeName(row.title, "Untitled"),
    author: normalizeName(row.author, "Unknown author"),
    availableCopies: Number(row.available_copies ?? 0),
  }));

  return { members, books };
}

export async function getPendingReturnRequests(limit = 50): Promise<PendingReturnRequest[]> {
  const { data: requestRows } = await supabaseAdmin
    .from("return_requests")
    .select("id,transaction_id,user_id,status,requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .limit(limit);

  const rows = (requestRows ?? []) as PendingRequestRow[];

  if (rows.length === 0) return [];

  const txIds = Array.from(new Set(rows.map((row) => row.transaction_id)));
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

  const [{ data: txRows }, { data: profileRows }] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select("id,due_date,book_copy_id")
      .in("id", txIds),
    supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds),
  ]);

  const txLookupRows = (txRows ?? []) as TxLookupRow[];

  const copyIds = Array.from(new Set(txLookupRows.map((row) => Number(row.book_copy_id)).filter((value) => Number.isFinite(value) && value > 0)));

  const copyRowsResult = copyIds.length
    ? await supabaseAdmin.from("book_copies").select("id,book_id").in("id", copyIds)
    : { data: [] as CopyLookupRow[] };
  const copyRows = (copyRowsResult.data ?? []) as CopyLookupRow[];

  const bookIds = Array.from(new Set(copyRows.map((row) => Number(row.book_id)).filter((value) => Number.isFinite(value) && value > 0)));

  const bookRowsResult = bookIds.length
    ? await supabaseAdmin.from("books").select("id,title").in("id", bookIds)
    : { data: [] as BookLiteRow[] };
  const bookRows = (bookRowsResult.data ?? []) as BookLiteRow[];

  const profileLookupRows = (profileRows ?? []) as ProfileLiteRow[];

  const txById = new Map<number, { due_date: string | null; book_copy_id: number | null }>();
  txLookupRows.forEach((row) => {
    txById.set(Number(row.id), {
      due_date: row.due_date ?? null,
      book_copy_id: Number(row.book_copy_id ?? 0) || null,
    });
  });

  const copyToBookId = new Map<number, number>();
  copyRows.forEach((row) => {
    const copyId = Number(row.id);
    const bookId = Number(row.book_id);
    if (Number.isFinite(copyId) && Number.isFinite(bookId)) {
      copyToBookId.set(copyId, bookId);
    }
  });

  const bookTitleById = new Map<number, string>();
  bookRows.forEach((row) => {
    const bookId = Number(row.id);
    if (Number.isFinite(bookId)) {
      bookTitleById.set(bookId, normalizeName(row.title, "Unknown title"));
    }
  });

  const nameByUserId = new Map<string, string>();
  profileLookupRows.forEach((row) => {
    nameByUserId.set(String(row.id), normalizeName(row.full_name, `User ${String(row.id).slice(0, 8)}`));
  });

  return rows.map((row) => {
    const tx = txById.get(Number(row.transaction_id));
    const bookId = tx?.book_copy_id ? copyToBookId.get(tx.book_copy_id) : undefined;
    const title = bookId ? bookTitleById.get(bookId) : undefined;

    return {
      id: Number(row.id),
      transactionId: Number(row.transaction_id),
      requestedByUserId: String(row.user_id),
      requestedByName: nameByUserId.get(String(row.user_id)) ?? `User ${String(row.user_id).slice(0, 8)}`,
      requestedAt: row.requested_at ?? null,
      bookTitle: title ?? "Unknown title",
      dueDate: tx?.due_date ?? null,
    };
  });
}

export async function getRecentCirculationRows(limit = 80): Promise<CirculationRow[]> {
  const { data: txRows } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,status,issue_date,due_date,return_date,fine_amount,book_copy_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (txRows ?? []) as TxRow[];

  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const copyIds = Array.from(
    new Set(
      rows
        .map((row) => Number(row.book_copy_id))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );

  const [{ data: profileRows }, { data: copyRows }] = await Promise.all([
    userIds.length
      ? supabaseAdmin
          .from("profiles")
          .select("id,full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [] as ProfileLiteRow[] }),
    copyIds.length
      ? supabaseAdmin
          .from("book_copies")
          .select("id,book_id")
          .in("id", copyIds)
      : Promise.resolve({ data: [] as CopyLookupRow[] }),
  ]);

  const safeProfileRows = (profileRows ?? []) as ProfileLiteRow[];
  const safeCopyRows = (copyRows ?? []) as CopyLookupRow[];

  const bookIds = Array.from(new Set(safeCopyRows.map((row) => Number(row.book_id)).filter((value) => Number.isFinite(value) && value > 0)));

  const bookRowsResult = bookIds.length
    ? await supabaseAdmin.from("books").select("id,title").in("id", bookIds)
    : { data: [] as BookLiteRow[] };
  const bookRows = (bookRowsResult.data ?? []) as BookLiteRow[];

  const userNameById = new Map<string, string>();
  safeProfileRows.forEach((row) => {
    userNameById.set(String(row.id), normalizeName(row.full_name, `User ${String(row.id).slice(0, 8)}`));
  });

  const copyToBookId = new Map<number, number>();
  safeCopyRows.forEach((row) => {
    const copyId = Number(row.id);
    const bookId = Number(row.book_id);
    if (Number.isFinite(copyId) && Number.isFinite(bookId)) {
      copyToBookId.set(copyId, bookId);
    }
  });

  const bookTitleById = new Map<number, string>();
  bookRows.forEach((row) => {
    const bookId = Number(row.id);
    if (Number.isFinite(bookId)) {
      bookTitleById.set(bookId, normalizeName(row.title, "Unknown title"));
    }
  });

  return rows.map((row) => {
    const copyId = Number(row.book_copy_id);
    const bookId = Number.isFinite(copyId) ? copyToBookId.get(copyId) : undefined;
    const bookTitle = bookId ? bookTitleById.get(bookId) : undefined;

    return {
      id: Number(row.id),
      userId: String(row.user_id),
      userName: userNameById.get(String(row.user_id)) ?? `User ${String(row.user_id).slice(0, 8)}`,
      bookTitle: bookTitle ?? "Unknown title",
      status: normalizeName(row.status, "issued"),
      issueDate: row.issue_date ?? null,
      dueDate: row.due_date ?? null,
      returnDate: row.return_date ?? null,
      fineAmount: Number(row.fine_amount ?? 0),
    };
  });
}
