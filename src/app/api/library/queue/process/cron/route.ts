import { NextResponse } from "next/server";

import { runQueueProcessor } from "@/lib/server/queueProcessor";

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expected = process.env.CRON_SECRET;

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runQueueProcessor();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
