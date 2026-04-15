import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/apiAuth";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import { adjustBookCopies } from "@/lib/server/catalogService";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) return NextResponse.json({ error: permission.message }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const delta = Number(body.delta ?? 0);
  const { id } = await context.params;
  const bookId = Number(id || 0);

  if (!Number.isFinite(bookId) || bookId <= 0) return NextResponse.json({ error: "Invalid book id" }, { status: 400 });
  if (!Number.isFinite(delta) || delta === 0) return NextResponse.json({ error: "Invalid delta" }, { status: 400 });

  try {
    const updated = await adjustBookCopies(bookId, delta);
    return NextResponse.json({ ok: true, book: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }
}
