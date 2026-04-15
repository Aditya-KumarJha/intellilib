import { NextResponse } from "next/server";

import supabaseAdmin from "@/lib/supabaseServerClient";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(100, Number(url.searchParams.get("limit") || "20")) || 20;
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const offset = (page - 1) * limit;

    let builder = supabaseAdmin
      .from("books")
      .select(
        `id,title,author,category,description,available_copies,total_copies,cover_url`
      )
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) {
      // search title or author
      const pattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      builder = supabaseAdmin
        .from("books")
        .select(
          `id,title,author,category,description,available_copies,total_copies,cover_url`
        )
        .or(`title.ilike.${pattern},author.ilike.${pattern}`)
        .order("title", { ascending: true })
        .range(offset, offset + limit - 1);
    }

    const { data, error } = await builder;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ books: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
