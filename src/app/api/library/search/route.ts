import { NextResponse } from "next/server";

import supabaseAdmin from "@/lib/supabaseServerClient";

type SearchBookRow = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  available_copies: number | null;
  total_copies: number | null;
  cover_url: string | null;
  categories: { name: string | null } | Array<{ name: string | null }> | null;
};

function normalizeCategory(
  categories: SearchBookRow["categories"],
): string | null {
  if (!categories) {
    return null;
  }

  if (Array.isArray(categories)) {
    return categories[0]?.name ?? null;
  }

  return categories.name ?? null;
}

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
        `id,title,author,description,available_copies,total_copies,cover_url,categories(name)`
      )
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (q) {
      // search title or author
      const pattern = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      builder = supabaseAdmin
        .from("books")
        .select(
          `id,title,author,description,available_copies,total_copies,cover_url,categories(name)`
        )
        .or(`title.ilike.${pattern},author.ilike.${pattern}`)
        .order("title", { ascending: true })
        .range(offset, offset + limit - 1);
    }

    const { data, error } = await builder;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const books = ((data ?? []) as SearchBookRow[]).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      available_copies: book.available_copies,
      total_copies: book.total_copies,
      cover_url: book.cover_url,
      category: normalizeCategory(book.categories),
    }));

    return NextResponse.json({ books });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
