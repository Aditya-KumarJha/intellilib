import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import supabaseAdmin from "@/lib/supabaseServerClient";

type BookmarkBody = {
  bookId?: number;
};

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: BookmarkBody = await req.json().catch(() => ({}));
  const bookId = Number(body.bookId);

  if (!Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid bookId" }, { status: 400 });
  }

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id,title")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const { data: existing } = await supabaseAdmin
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, bookmark: existing, alreadyBookmarked: true });
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("bookmarks")
    .insert({
      user_id: user.id,
      book_id: bookId,
    })
    .select("id,book_id,created_at")
    .maybeSingle();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not add bookmark" },
      { status: 500 },
    );
  }

  await logAuditEvent({
    userId: user.id,
    action: "bookmark_added",
    entity: "bookmark",
    entityId: inserted.id,
    metadata: {
      bookId,
      title: book.title,
    },
  });

  return NextResponse.json({ ok: true, bookmark: inserted });
}

export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const bookId = Number(url.searchParams.get("bookId"));

  if (!Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid bookId" }, { status: 400 });
  }

  const { data: bookmark, error: fetchError } = await supabaseAdmin
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!bookmark?.id) {
    return NextResponse.json({ ok: true, removed: false });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("bookmarks")
    .delete()
    .eq("id", bookmark.id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await logAuditEvent({
    userId: user.id,
    action: "bookmark_removed",
    entity: "bookmark",
    entityId: bookmark.id,
    metadata: {
      bookId,
    },
  });

  return NextResponse.json({ ok: true, removed: true });
}
