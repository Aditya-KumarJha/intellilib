import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { syncOutstandingFinesForUser } from "@/lib/server/finesService";
import supabaseAdmin from "@/lib/supabaseServerClient";

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncOutstandingFinesForUser(user.id);
  } catch (error) {
    console.error("[library/fines] fine sync failed", error);
  }

  const { data, error } = await supabaseAdmin
    .from("fines")
    .select(
      "id,amount,transaction_id,paid_at,created_at,status,transactions(id,issue_date,due_date,return_date,status,fine_amount,book_copies(id,location,access_url,books(id,title,author,cover_url,publisher)))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load fines right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fines: data ?? [] });
}
