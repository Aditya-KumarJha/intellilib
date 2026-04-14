import supabaseAdmin from "@/lib/supabaseServerClient";

export type PopulatedReservation = {
  id: number;
  user_id: string;
  book_id: number;
  status: string;
  queue_position: number | null;
  created_at: string;
  user_display_name: string | null;
  user_avatar: string | null;
  book_title: string | null;
};

export async function getPendingReservations(): Promise<PopulatedReservation[]> {
  const { data: resData, error: resErr } = await supabaseAdmin
    .from("reservations")
    .select("id,user_id,book_id,status,queue_position,created_at")
    .in("status", ["waiting", "approved", "cancelled"])
    .order("created_at", { ascending: true });

  if (resErr || !resData) return [];

  const userIds = Array.from(new Set(resData.map((r: any) => r.user_id).filter(Boolean)));
  const bookIds = Array.from(new Set(resData.map((r: any) => r.book_id).filter(Boolean)));

  const [{ data: profiles }, { data: books }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    bookIds.length
      ? supabaseAdmin.from("books").select("id,title").in("id", bookIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const bookMap = new Map((books ?? []).map((b: any) => [b.id, b]));

  return resData.map((r: any) => {
    const profile = profileMap.get(r.user_id) || null;
    const book = bookMap.get(r.book_id) || null;
    return {
      ...r,
      user_display_name: profile?.full_name ?? null,
      user_avatar: profile?.avatar_url ?? null,
      book_title: book?.title ?? null,
    };
  });
}
