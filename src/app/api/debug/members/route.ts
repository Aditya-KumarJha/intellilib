import { NextResponse } from "next/server";
import { getMembersDebug } from "@/lib/server/members";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const debug = await getMembersDebug();
  return NextResponse.json(debug);
}
