import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/apiAuth";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import { resolveCategoryId, updateBookAndAssets } from "@/lib/server/catalogService";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) return NextResponse.json({ error: permission.message }, { status: 403 });

  const { id } = await context.params;
  const bookId = String(id ?? "").trim();
  if (!bookId) {
    return NextResponse.json({ error: "Invalid book id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    id: _payloadId,
    title,
    author,
    type = "physical",
    copies: _copies,
    coverBase64,
    coverName,
    pdfBase64,
    pdfName,
    category_id,
    category_name,
    ...rest
  } = body;

  if (!title || !author) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const book: Record<string, unknown> = { title, author, type, ...rest };

  let coverBuffer: Buffer | undefined;
  let pdfBuffer: Buffer | undefined;

  if (coverBase64) coverBuffer = Buffer.from(coverBase64, "base64");
  if (pdfBase64) pdfBuffer = Buffer.from(pdfBase64, "base64");

  try {
    const resolvedCategoryId = await resolveCategoryId({ categoryId: category_id, categoryName: category_name });
    if (!resolvedCategoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    book.category_id = resolvedCategoryId;

    const updated = await updateBookAndAssets({
      bookId,
      book,
      coverBuffer,
      coverName,
      pdfBuffer,
      pdfName,
    });
    return NextResponse.json({ ok: true, book: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
