import { notifyUserById } from "@/lib/server/libraryNotifications";
import { hasRecentNotification } from "@/lib/server/libraryNotifications";
import { compactQueuePositions, getApprovedReservationCount, getPhysicalAvailableCopyIds } from "@/lib/server/reservationService";
import supabaseAdmin from "@/lib/supabaseServerClient";

const HOLD_HOURS = 24;

function formatHoldDeadline(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function addHours(date: Date, hours: number) {
  const value = new Date(date);
  value.setHours(value.getHours() + hours);
  return value;
}

async function sendDueAndFineAlerts() {
  const now = new Date();
  const dueSoonCutoff = addHours(now, 48).toISOString();
  const dedupeSince = addHours(now, -24).toISOString();
  let dueReminderCount = 0;
  let fineAlertCount = 0;

  const { data: dueSoonRows } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,due_date,status,fine_amount,book_copies!inner(books(title))")
    .is("return_date", null)
    .gte("due_date", now.toISOString())
    .lte("due_date", dueSoonCutoff)
    .limit(500);

  for (const row of dueSoonRows ?? []) {
    const copy = Array.isArray(row.book_copies) ? row.book_copies[0] : row.book_copies;
    const book = Array.isArray(copy?.books) ? copy?.books[0] : copy?.books;
    const bookTitle = book?.title ?? "your book";
    const dueText = row.due_date
      ? new Date(row.due_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
      : "soon";
    const message = `Reminder: ${bookTitle} is due by ${dueText}.`;

    const alreadySent = await hasRecentNotification(row.user_id, "due_reminder", message, dedupeSince);
    if (alreadySent) continue;

    await notifyUserById(row.user_id, {
      inAppMessage: message,
      subject: "IntelliLib: Due Date Reminder",
      text: message,
      html: `<p>${message}</p>`,
      type: "due_reminder",
    });

    dueReminderCount += 1;
  }

  const { data: fineRows } = await supabaseAdmin
    .from("fines")
    .select("id,user_id,amount,transaction_id")
    .is("paid_at", null)
    .gt("amount", 0)
    .limit(500);

  for (const fine of fineRows ?? []) {
    const message = `Fine alert: INR ${Math.round(Number(fine.amount ?? 0))} pending. Please pay to avoid account restrictions.`;
    const alreadySent = await hasRecentNotification(fine.user_id, "fine_alert", message, dedupeSince);
    if (alreadySent) continue;

    await notifyUserById(fine.user_id, {
      inAppMessage: message,
      subject: "IntelliLib: Fine Payment Reminder",
      text: message,
      html: `<p>${message}</p>`,
      type: "fine_alert",
    });

    fineAlertCount += 1;
  }

  return { dueReminders: dueReminderCount, fineAlerts: fineAlertCount };
}

async function expireStaleApprovals() {
  const threshold = new Date(Date.now() - HOLD_HOURS * 60 * 60 * 1000).toISOString();

  const { data: staleRows } = await supabaseAdmin
    .from("reservations")
    .select("id,user_id,book_id,books(title)")
    .eq("status", "approved")
    .lt("created_at", threshold);

  if (!staleRows || staleRows.length === 0) return { expired: 0 };

  for (const row of staleRows) {
    const relatedBook = Array.isArray(row.books) ? row.books[0] : row.books;
    const bookTitle = relatedBook?.title ?? "book";

    await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled", queue_position: null })
      .eq("id", row.id);

    await notifyUserById(row.user_id, {
      inAppMessage: `Your collection window expired for ${bookTitle}. You were removed from the queue.`,
      subject: "IntelliLib: Reservation Hold Expired",
      text: `Your reservation hold has expired for ${bookTitle}. You were removed from the queue and can reserve again.`,
      html: `<p>Your reservation hold has expired for <strong>${bookTitle}</strong>.</p><p>You were removed from the queue and can reserve again.</p>`,
    });

    await compactQueuePositions(row.book_id);
  }

  return { expired: staleRows.length };
}

async function approveQueuesForAvailableBooks() {
  const { data: books } = await supabaseAdmin
    .from("books")
    .select("id,title")
    .order("id", { ascending: true });

  if (!books || books.length === 0) return { approved: 0 };

  let approvedCount = 0;

  for (const book of books) {
    const availableCopyIds = await getPhysicalAvailableCopyIds(book.id);
    if (availableCopyIds.length === 0) continue;
    const approvedReservationsCount = await getApprovedReservationCount(book.id);
    const promotableSlots = Math.max(0, availableCopyIds.length - approvedReservationsCount);
    if (promotableSlots === 0) continue;

    const { data: waitingRows } = await supabaseAdmin
      .from("reservations")
      .select("id,user_id,queue_position")
      .eq("book_id", book.id)
      .eq("status", "waiting")
      .order("queue_position", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(promotableSlots);

    if (!waitingRows || waitingRows.length === 0) continue;

    const now = new Date();
    const holdUntil = addHours(now, HOLD_HOURS).toISOString();
    const holdUntilText = formatHoldDeadline(holdUntil);

    for (const reservation of waitingRows) {
      await supabaseAdmin
        .from("reservations")
        .update({ status: "approved", created_at: now.toISOString() })
        .eq("id", reservation.id);

      await notifyUserById(reservation.user_id, {
        inAppMessage: `${book.title} is now available. Collect before ${holdUntilText} with your ID card.`,
        subject: "IntelliLib: Reserved Book Available",
        text: `Good news. ${book.title} is available now. Please collect it from the counter by ${holdUntilText} with your ID card.`,
        html: `<p><strong>${book.title}</strong> is now available for you.</p><p>Please collect it from the library counter by <strong>${holdUntilText}</strong> and bring your ID card.</p>`,
      });

      approvedCount += 1;
    }

    await compactQueuePositions(book.id);
  }

  return { approved: approvedCount };
}

export async function runQueueProcessor() {
  const expired = await expireStaleApprovals();
  const approved = await approveQueuesForAvailableBooks();
  const alerts = await sendDueAndFineAlerts();
  return { ok: true, ...expired, ...approved, ...alerts };
}
