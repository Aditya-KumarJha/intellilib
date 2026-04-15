import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/apiAuth";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import { addBookAndCopies, resolveCategoryId } from "@/lib/server/catalogService";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) return NextResponse.json({ error: permission.message }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { title, author, type = "physical", copies = 0, coverBase64, coverName, pdfBase64, pdfName, category_id, category_name, ...rest } = body;

  if (!title || !author) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

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
    const created = await addBookAndCopies({ book, coverBuffer, coverName, pdfBuffer, pdfName, copies });
    return NextResponse.json({ ok: true, book: created });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
