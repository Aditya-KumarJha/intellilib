import supabaseAdmin from "@/lib/supabaseServerClient";

type ReservationRow = {
  id: number;
  user_id: string;
  book_id: number;
  status: string;
  queue_position: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type BookRow = {
  id: number;
  title: string | null;
};

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

  const reservations = resData as ReservationRow[];
  const userIds = Array.from(new Set(reservations.map((reservation) => reservation.user_id).filter(Boolean)));
  const bookIds = Array.from(new Set(reservations.map((reservation) => reservation.book_id).filter(Boolean)));

  const [{ data: profiles }, { data: books }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("id,full_name,avatar_url").in("id", userIds)
      : Promise.resolve({ data: [] }),
    bookIds.length
      ? supabaseAdmin.from("books").select("id,title").in("id", bookIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const bookMap = new Map(((books ?? []) as BookRow[]).map((book) => [book.id, book]));

  return reservations.map((reservation) => {
    const profile = profileMap.get(reservation.user_id) ?? null;
    const book = bookMap.get(reservation.book_id) ?? null;
    return {
      ...reservation,
      user_display_name: profile?.full_name ?? null,
      user_avatar: profile?.avatar_url ?? null,
      book_title: book?.title ?? null,
    };
  });
}
