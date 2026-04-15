import supabaseAdmin from "@/lib/supabaseServerClient";

export type LibraryPolicy = {
  maxBooksPerUser: number;
  maxDaysAllowed: number;
  finePerDay: number;
};

export type PromotedReservation = {
  reservationId: number;
  userId: string;
  queuePosition: number | null;
  approvedAt: string | null;
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
    .in("status", ["waiting", "approved"])
    .order("queue_position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return;

  for (let index = 0; index < data.length; index += 1) {
    await supabaseAdmin
      .from("reservations")
      .update({ queue_position: -1 * (index + 1) })
      .eq("id", data[index].id);
  }

  for (let index = 0; index < data.length; index += 1) {
    await supabaseAdmin
      .from("reservations")
      .update({ queue_position: index + 1 })
      .eq("id", data[index].id);
  }
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

type PromoteReservationRpcRow = {
  reservation_id: number;
  user_id: string;
  queue_position: number | null;
  approved_at: string | null;
};

function mapPromotedReservation(row: PromoteReservationRpcRow): PromotedReservation {
  return {
    reservationId: Number(row.reservation_id),
    userId: String(row.user_id),
    queuePosition: row.queue_position == null ? null : Number(row.queue_position),
    approvedAt: row.approved_at ?? null,
  };
}

function isMissingRpcError(error: unknown) {
  const message = String(
    typeof error === "object" && error !== null && "message" in error
      ? (error as { message?: string }).message
      : error,
  );

  return message.includes("Could not find the function")
    || message.includes("does not exist")
    || message.includes("schema cache");
}

async function promoteWaitingReservationsForBookFallback(bookId: number, limit?: number) {
  const availableCopyIds = await getPhysicalAvailableCopyIds(bookId);
  const approvedCount = await getApprovedReservationCount(bookId);
  const promotableSlots = Math.max(0, availableCopyIds.length - approvedCount);
  const effectiveLimit = Math.max(0, Math.min(promotableSlots, limit ?? promotableSlots));

  if (effectiveLimit === 0) {
    return [] as PromotedReservation[];
  }

  const { data: waitingRows, error } = await supabaseAdmin
    .from("reservations")
    .select("id,user_id,queue_position,created_at")
    .eq("book_id", bookId)
    .eq("status", "waiting")
    .order("queue_position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(effectiveLimit);

  if (error || !waitingRows || waitingRows.length === 0) {
    return [] as PromotedReservation[];
  }

  const approvedAt = new Date().toISOString();
  const promoted: PromotedReservation[] = [];

  for (const row of waitingRows) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({ status: "approved", created_at: approvedAt })
      .eq("id", row.id)
      .eq("status", "waiting")
      .select("id,user_id,queue_position,created_at")
      .maybeSingle();

    if (updateError || !updated) {
      continue;
    }

    promoted.push({
      reservationId: Number(updated.id),
      userId: String(updated.user_id),
      queuePosition: updated.queue_position == null ? null : Number(updated.queue_position),
      approvedAt: updated.created_at ?? approvedAt,
    });
  }

  return promoted;
}

export async function promoteWaitingReservationsForBook(bookId: number, limit?: number) {
  try {
    const { data, error } = await supabaseAdmin.rpc("promote_waiting_reservations", {
      p_book_id: bookId,
      p_limit: typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : null,
    });

    if (error) {
      if (isMissingRpcError(error)) {
        return promoteWaitingReservationsForBookFallback(bookId, limit);
      }

      throw error;
    }

    const rows = Array.isArray(data) ? (data as PromoteReservationRpcRow[]) : [];
    return rows.map(mapPromotedReservation);
  } catch (error) {
    if (isMissingRpcError(error)) {
      return promoteWaitingReservationsForBookFallback(bookId, limit);
    }

    throw error;
  }
}
