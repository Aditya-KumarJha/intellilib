import supabaseAdmin from "@/lib/supabaseServerClient";
import { supabase as supabaseAnon } from "@/lib/supabaseClient";

export type Member = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  joinedAt: string | null;
  avatar?: string | null;
  lastSignIn?: string | null;
};

export async function getMembers(): Promise<Member[]> {
  try {
    let res: { data: any[] | null; error: any } = { data: null, error: null };
    const usingService = Boolean(process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY);

    // silent fetch, no debug logs

    const selectCols = "id,full_name,role,status,created_at,avatar_url";

    if (usingService) {
      res = await supabaseAdmin.from("profiles").select(selectCols).order("created_at", { ascending: false });
    } else {
      res = await supabaseAnon.from("profiles").select(selectCols).order("created_at", { ascending: false });
    }

    if (res.error) return [];

    const rows = res.data ?? [];

    // If service role key is available, fetch emails and last sign-in from Auth admin API and join.
    const emailMap: Record<string, string | null> = {};
    const lastSignInMap: Record<string, string | null> = {};

    if (usingService && rows.length > 0) {
      const ids = rows.map((r: any) => r.id).filter(Boolean);
      if (ids.length) {
        const results = await Promise.all(
          ids.map(async (uid: string) => {
            try {
              const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
              if (error) return { id: uid, email: null, last_sign_in: null, error };
              const email = data?.user?.email ?? null;
              const lastSignIn = data?.user?.last_sign_in_at ?? null;
              return { id: uid, email, last_sign_in: lastSignIn };
            } catch (err) {
              return { id: uid, email: null, last_sign_in: null, error: err };
            }
          })
        );

        for (const r of results) {
          if ((r as any).error) continue;
          emailMap[String(r.id)] = (r as any).email ?? null;
          lastSignInMap[String(r.id)] = (r as any).last_sign_in ?? null;
        }
      }
    }

    return (rows as any[]).map((r) => ({
      id: String(r.id),
      name: r.full_name ?? null,
      email: emailMap[String(r.id)] ?? null,
      role: r.role ?? null,
      status: (r.status as string) ?? null,
      joinedAt: r.created_at ?? null,
      avatar: r.avatar_url ?? null,
      lastSignIn: lastSignInMap[String(r.id)] ?? null,
    }));
  } catch (e) {
    return [];
  }
}

export type MembersDebug = {
  rows: any[];
  emailMap: Record<string, string | null>;
  errors?: any[];
};

export async function getMembersDebug(): Promise<MembersDebug> {
  const debug: MembersDebug = { rows: [], emailMap: {}, errors: [] };
  try {
    const usingService = Boolean(process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY);
    const selectCols = "id,full_name,role,status,created_at,avatar_url";
    const res = usingService
      ? await supabaseAdmin.from("profiles").select(selectCols).order("created_at", { ascending: false })
      : await supabaseAnon.from("profiles").select(selectCols).order("created_at", { ascending: false });

    if (res.error) {
      debug.errors?.push({ type: "profiles_fetch", error: res.error });
      return debug;
    }

    const rows = res.data ?? [];
    debug.rows = rows;

    if (usingService && rows.length > 0) {
      const ids = rows.map((r: any) => r.id).filter(Boolean);
      const results = await Promise.all(
        ids.map(async (uid: string) => {
          try {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
            if (error) return { id: uid, email: null, error };
            const email = data?.user?.email ?? null;
            return { id: uid, email };
          } catch (err) {
            return { id: uid, email: null, error: err };
          }
        })
      );

      for (const r of results) {
        if ((r as any).error) debug.errors?.push({ id: r.id, error: (r as any).error });
        debug.emailMap[String(r.id)] = (r as any).email ?? null;
      }
    }

    return debug;
  } catch (e) {
    debug.errors?.push(e);
    return debug;
  }
}
