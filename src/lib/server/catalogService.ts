import supabaseAdmin from "@/lib/supabaseServerClient";
import { uploadToImageKit } from "./imagekit";
import { getIssueDurationDays } from "./reservationService";

export async function resolveCategoryId({ categoryId, categoryName }: { categoryId?: unknown; categoryName?: unknown }) {
  const parsedCategoryId = Number(categoryId);
  if (Number.isFinite(parsedCategoryId) && parsedCategoryId > 0) {
    return parsedCategoryId;
  }

  const normalizedName = typeof categoryName === "string" ? categoryName.trim() : "";
  if (!normalizedName) return null;

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("categories")
    .select("id,name")
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message || "Could not load categories");
  if (existing?.id) return Number(existing.id);

  const { data: created, error: insertError } = await supabaseAdmin
    .from("categories")
    .insert({ name: normalizedName })
    .select("id")
    .maybeSingle();

  if (insertError || !created) {
    throw new Error(insertError?.message || "Could not create custom category");
  }

  return Number(created.id);
}

export async function addBookAndCopies({
  book,
  coverBuffer,
  coverName,
  pdfBuffer,
  pdfName,
  copies = 0,
}: {
  book: Record<string, unknown>;
  coverBuffer?: Buffer;
  coverName?: string;
  pdfBuffer?: Buffer;
  pdfName?: string;
  copies?: number;
}) {
  // upload files if present
  if (coverBuffer && coverName) {
    try {
      const url = await uploadToImageKit({ fileBuffer: coverBuffer, fileName: coverName });
      book.cover_url = url;
    } catch (err) {
      console.error("Cover upload failed", err);
      throw new Error("Cover upload failed");
    }
  }

  if (pdfBuffer && pdfName) {
    try {
      const url = await uploadToImageKit({ fileBuffer: pdfBuffer, fileName: pdfName });
      book.pdf_url = url;
    } catch (err) {
      console.error("PDF upload failed", err);
      throw new Error("PDF upload failed");
    }
  }

  const { data: created, error } = await supabaseAdmin.from("books").insert(book).select("id,total_copies,available_copies").maybeSingle();
  if (error || !created) throw new Error(error?.message ?? "Could not create book");

  const bookId = created.id;

  if (copies > 0 && (book.type === "physical" || book.type === "both")) {
    const rows = Array.from({ length: copies }).map(() => ({ book_id: bookId, type: "physical", status: "available" }));
    const { error: insertCopiesError } = await supabaseAdmin.from("book_copies").insert(rows);
    if (insertCopiesError) console.error("Failed to insert copies", insertCopiesError);

    // update counts
    await supabaseAdmin
      .from("books")
      .update({ total_copies: (created.total_copies ?? 0) + copies, available_copies: (created.available_copies ?? 0) + copies })
      .eq("id", bookId);
  }

  return created;
}

export async function updateBookAndAssets({
  bookId,
  book,
  coverBuffer,
  coverName,
  pdfBuffer,
  pdfName,
}: {
  bookId: string | number;
  book: Record<string, unknown>;
  coverBuffer?: Buffer;
  coverName?: string;
  pdfBuffer?: Buffer;
  pdfName?: string;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("books")
    .select("id,cover_url,pdf_url")
    .eq("id", bookId)
    .maybeSingle();
  if (existingError || !existing) throw new Error(existingError?.message ?? "Book not found");

  if (coverBuffer && coverName) {
    try {
      const url = await uploadToImageKit({ fileBuffer: coverBuffer, fileName: coverName });
      book.cover_url = url;
    } catch (err) {
      console.error("Cover upload failed", err);
      throw new Error("Cover upload failed");
    }
  }

  if (pdfBuffer && pdfName) {
    try {
      const url = await uploadToImageKit({ fileBuffer: pdfBuffer, fileName: pdfName });
      book.pdf_url = url;
    } catch (err) {
      console.error("PDF upload failed", err);
      throw new Error("PDF upload failed");
    }
  }

  const { data: updated, error } = await supabaseAdmin.from("books").update(book).eq("id", bookId).select("id").maybeSingle();
  if (error || !updated) throw new Error(error?.message ?? "Could not update book");

  return updated;
}

export async function adjustBookCopies(bookId: number, delta: number) {
  // optimistic retry update total and available counts with backoff
  const MAX_ATTEMPTS = 6;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data: current } = await supabaseAdmin.from("books").select("id,total_copies,available_copies,type").eq("id", bookId).maybeSingle();
    if (!current) throw new Error("Book not found");

    const newTotal = Number(current.total_copies ?? 0) + delta;
    const newAvailable = Number(current.available_copies ?? 0) + delta;
    if (newTotal < 0 || newAvailable < 0) throw new Error("Cannot reduce copies below zero");

    const { data, error } = await supabaseAdmin
      .from("books")
      .update({ total_copies: newTotal, available_copies: newAvailable })
      .select("id,total_copies,available_copies")
      .eq("id", bookId)
      .eq("total_copies", current.total_copies)
      .maybeSingle();

    if (!error && data) {
      // if increasing and previous available was 0 then try to allocate to reservations
      if (delta > 0 && Number(current.available_copies ?? 0) === 0) {
        // run queue allocation logic - promote and issue directly, but don't block forever
        try {
          await allocateCopiesToQueue(bookId);
        } catch (e) {
          // best-effort: log and continue
          console.warn("allocateCopiesToQueue failed", e);
        }
      }

      return data;
    }
    // record last error and backoff before retrying
    lastError = error ?? lastError;
    const backoffMs = 50 * (attempt + 1);
    // small delay
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
  // Fallback: try an unconditional update as a last resort to break contention.
  try {
    const { data: current } = await supabaseAdmin.from("books").select("id,total_copies,available_copies,type").eq("id", bookId).maybeSingle();
    if (!current) throw new Error("Book not found");

    const newTotal = Number(current.total_copies ?? 0) + delta;
    const newAvailable = Number(current.available_copies ?? 0) + delta;
    if (newTotal < 0 || newAvailable < 0) throw new Error("Cannot reduce copies below zero");

    const { data, error } = await supabaseAdmin
      .from("books")
      .update({ total_copies: newTotal, available_copies: newAvailable })
      .eq("id", bookId)
      .select("id,total_copies,available_copies")
      .maybeSingle();

    if (error || !data) {
      console.error("Fallback update failed", error);
      throw new Error("Could not update book copies due to contention");
    }

    if (delta > 0 && Number(current.available_copies ?? 0) === 0) {
      try {
        await allocateCopiesToQueue(bookId);
      } catch (e) {
        console.warn("allocateCopiesToQueue failed after fallback", e);
      }
    }

    return data;
  } catch (e) {
    console.error("adjustBookCopies final failure", e, lastError);
    throw new Error("Could not update book copies due to contention");
  }
}

export async function allocateCopiesToQueue(bookId: number) {
  const { data: availableCopies } = await supabaseAdmin
    .from("book_copies")
    .select("id")
    .eq("book_id", bookId)
    .eq("status", "available")
    .order("id", { ascending: true })
    .limit(50);

  const availIds = (availableCopies ?? []).map((r: { id: number }) => r.id);
  if (availIds.length === 0) return { issued: 0 };

  // get waiting reservations
  const { data: waiting } = await supabaseAdmin
    .from("reservations")
    .select("id,user_id,queue_position")
    .eq("book_id", bookId)
    .eq("status", "waiting")
    .order("queue_position", { ascending: true })
    .limit(availIds.length);

  if (!waiting || waiting.length === 0) return { issued: 0 };

  const now = new Date().toISOString();
  const issueDays = await getIssueDurationDays();
  const dueDate = new Date(Date.now() + issueDays * 24 * 60 * 60 * 1000).toISOString();

  let issued = 0;

  const pairs = Math.min(availIds.length, waiting.length);
  const ops: Array<Promise<unknown>> = [];
  for (let i = 0; i < pairs; i += 1) {
    const copyId = availIds[i];
    const reservation = waiting[i];

    const updateCopy = supabaseAdmin.from("book_copies").update({ status: "issued", issued_to: reservation.user_id }).eq("id", copyId);
    const insertTxn = supabaseAdmin.from("transactions").insert({
      user_id: reservation.user_id,
      book_copy_id: copyId,
      issue_date: now,
      due_date: dueDate,
      status: "issued",
    });
    const completeRes = supabaseAdmin.from("reservations").update({ status: "completed", queue_position: null }).eq("id", reservation.id);

    // run these three in parallel per pair
    ops.push(Promise.all([updateCopy, insertTxn, completeRes]));
    issued += 1;
  }

  // execute all pair operations in parallel to reduce latency
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    await Promise.all(ops);
  } catch (e) {
    console.warn("Error while issuing copies in parallel", e);
  }

  // adjust book counts via RPC; wrap in try/catch because PostgREST RPC builder
  // does not expose a .catch on its return type in TypeScript
  try {
    await supabaseAdmin.rpc("update_book_counts");
  } catch (e) {
    // best-effort: log and continue
    console.warn("update_book_counts RPC failed", e);
  }

  return { issued };
}
