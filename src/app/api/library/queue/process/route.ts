import { NextResponse } from "next/server";

import { runQueueProcessor } from "@/lib/server/queueProcessor";

export async function POST(req: Request) {
  const token = req.headers.get("x-scheduler-token");
  const expected = process.env.RESERVATION_SCHEDULER_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runQueueProcessor();
  return NextResponse.json(result);
}
