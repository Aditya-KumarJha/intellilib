import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import { compactQueuePositions, getPhysicalAvailableCopyIds } from "@/lib/server/reservationService";
import supabaseAdmin from "@/lib/supabaseServerClient";

type ReservationBody = {
  bookId?: number;
};

type QueuedReservationInsert = { id: number; queue_position: number };

type CreateQueuedReservationResult = {
  inserted: QueuedReservationInsert | null;
  error: Error | { message?: string; details?: string; code?: string } | null;
};

async function createQueuedReservation(userId: string, bookId: number): Promise<CreateQueuedReservationResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: maxQueue } = await supabaseAdmin
      .from("reservations")
      .select("queue_position")
      .eq("book_id", bookId)
      .eq("status", "waiting")
      .order("queue_position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = Number(maxQueue?.queue_position ?? 0) + 1;

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("reservations")
      .insert({
        user_id: userId,
        book_id: bookId,
        status: "waiting",
        queue_position: nextPosition,
      })
      .select("id,queue_position")
      .maybeSingle();

    if (!insertError && inserted) {
      return { inserted, error: null };
    }

    const combined = `${insertError?.message ?? ""} ${insertError?.details ?? ""}`.toLowerCase();
    if (insertError?.code === "23505" || combined.includes("unique_queue_position")) {
      continue;
    }

    return { inserted: null, error: insertError };
  }

  return { inserted: null, error: new Error("Could not place reservation in queue. Please try again.") };
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeHistory = url.searchParams.get("history") === "1";

  let query = supabaseAdmin
    .from("reservations")
    .select("id,book_id,status,queue_position,created_at,books(id,title,author,cover_url,type,available_copies,total_copies)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!includeHistory) {
    query = query.in("status", ["waiting", "approved"]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reservations: data ?? [] });
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: ReservationBody = await req.json().catch(() => ({}));
  const bookId = Number(body.bookId);

  if (!Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid bookId" }, { status: 400 });
  }

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id,title,type")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.type === "digital") {
    return NextResponse.json(
      { error: "Digital books do not require reservation." },
      { status: 409 },
    );
  }

  const activeCopies = await getPhysicalAvailableCopyIds(bookId);
  if (activeCopies.length > 0) {
    return NextResponse.json(
      {
        error: "Book is currently available. You can issue it now.",
        canIssue: true,
      },
      { status: 409 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("reservations")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .in("status", ["waiting", "approved"])
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json(
      { error: `You already have an active ${existing.status} reservation.` },
      { status: 409 },
    );
  }

  // Prevent creating a reservation if the user already holds an active issued copy
  const { data: activeHold } = await supabaseAdmin
    .from("transactions")
    .select("id,book_copies!inner(book_id)")
    .eq("user_id", user.id)
    .is("return_date", null)
    .eq("book_copies.book_id", bookId)
    .limit(1);

  if ((activeHold ?? []).length > 0) {
    return NextResponse.json(
      { error: "You already hold an active copy of this title." },
      { status: 409 },
    );
  }

  const { inserted, error: insertError } = await createQueuedReservation(user.id, bookId);

  if (insertError || !inserted) {
    const message = insertError instanceof Error
      ? insertError.message
      : insertError?.message ?? "Could not create reservation";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await notifyUserById(user.id, {
    inAppMessage: `${book.title} added to reservation queue at position #${inserted.queue_position}.`,
    subject: "IntelliLib: Reservation Queue Confirmed",
    text: `You are in queue for "${book.title}" at position #${inserted.queue_position}. We will notify you as soon as a copy is available.`,
    html: `<p>You are in queue for <strong>${book.title}</strong> at position <strong>#${inserted.queue_position}</strong>.</p><p>We will notify you as soon as a copy is available.</p>`,
  });

  return NextResponse.json({ ok: true, reservation: inserted });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid reservation id" }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("reservations")
    .select("id,book_id,status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (![
    "waiting",
    "approved",
  ].includes(row.status)) {
    return NextResponse.json({ error: "Only active reservations can be cancelled." }, { status: 409 });
  }

  await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled", queue_position: null })
    .eq("id", row.id);

  await compactQueuePositions(row.book_id);

  return NextResponse.json({ ok: true });
}
