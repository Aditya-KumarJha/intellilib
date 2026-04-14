import supabaseAdmin from "@/lib/supabaseServerClient";

export type LibraryPolicy = {
  maxBooksPerUser: number;
  maxDaysAllowed: number;
  finePerDay: number;
};

export async function getLibraryPolicy(): Promise<LibraryPolicy> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("max_books_per_user,max_days_allowed,fine_per_day")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const maxBooksPerUser = Number(data?.max_books_per_user ?? 3);
  const maxDaysAllowed = Number(data?.max_days_allowed ?? 14);
  const finePerDay = Number(data?.fine_per_day ?? 5);

  return {
    maxBooksPerUser: Number.isFinite(maxBooksPerUser) && maxBooksPerUser > 0 ? maxBooksPerUser : 3,
    maxDaysAllowed: Number.isFinite(maxDaysAllowed) && maxDaysAllowed > 0 ? maxDaysAllowed : 14,
    finePerDay: Number.isFinite(finePerDay) && finePerDay > 0 ? finePerDay : 5,
  };
}

export async function getIssueDurationDays() {
  const { maxDaysAllowed } = await getLibraryPolicy();
  return maxDaysAllowed;
}

export async function getMaxBooksPerUser() {
  const { maxBooksPerUser } = await getLibraryPolicy();
  return maxBooksPerUser;
}

export async function compactQueuePositions(bookId: number) {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select("id")
    .eq("book_id", bookId)
    .eq("status", "waiting")
    .order("queue_position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return;

  await Promise.all(
    data.map((row, index) =>
      supabaseAdmin
        .from("reservations")
        .update({ queue_position: index + 1 })
        .eq("id", row.id),
    ),
  );
}

export async function getPhysicalAvailableCopyIds(bookId: number) {
  const { data } = await supabaseAdmin
    .from("book_copies")
    .select("id")
    .eq("book_id", bookId)
    .eq("type", "physical")
    .eq("status", "available")
    .order("id", { ascending: true });

  return (data ?? []).map((row: { id: number }) => row.id);
}

export async function getApprovedReservationCount(bookId: number) {
  const { count } = await supabaseAdmin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("status", "approved");

  return Number(count ?? 0);
}

export async function getApprovedReservationForUser(bookId: number, userId: string) {
  const { data } = await supabaseAdmin
    .from("reservations")
    .select("id,user_id,created_at")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function hasApprovedReservationForAnotherUser(bookId: number, userId: string) {
  const { data } = await supabaseAdmin
    .from("reservations")
    .select("id")
    .eq("book_id", bookId)
    .eq("status", "approved")
    .neq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}
