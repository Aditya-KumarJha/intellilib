import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseServerClient";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
      return NextResponse.json({ error: "Missing book ID" }, { status: 400 });
    }

    const { data: book, error } = await supabaseAdmin
      .from("books")
      .select(
        `*, categories(name)`
      )
      .eq("id", id)
      .single();

    if (error || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Fetch related books based on category or author
    const categoryId = book.category_id;
    let relatedBooks: any[] = [];
    if (categoryId) {
      const { data: relatedData } = await supabaseAdmin
        .from("books")
        .select(`id, title, author, cover_url, type`)
        .eq("category_id", categoryId)
        .neq("id", id)
        .limit(4);
      relatedBooks = relatedData || [];
    }

    return NextResponse.json({
      book: {
        ...book,
        category: Array.isArray(book.categories) ? book.categories[0]?.name : book.categories?.name,
      },
      relatedBooks,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
