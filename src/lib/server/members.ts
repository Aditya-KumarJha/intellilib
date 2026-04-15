import supabaseAdmin from "@/lib/supabaseServerClient";
import { supabase as supabaseAnon } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  avatar_url: string | null;
};

type AdminUserLookup = {
  id: string;
  email: string | null;
  last_sign_in: string | null;
  error?: unknown;
};

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
    let res: { data: ProfileRow[] | null; error: unknown } = { data: null, error: null };
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
      const ids = rows.map((row) => row.id).filter(Boolean);
      if (ids.length) {
        const results: AdminUserLookup[] = await Promise.all(
          ids.map(async (uid: string) => {
            try {
              const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
              if (error) return { id: uid, email: null, last_sign_in: null, error };
              const email = data?.user?.email ?? null;
              const lastSignIn = data?.user?.last_sign_in_at ?? null;
              return { id: uid, email, last_sign_in: lastSignIn };
            } catch (error: unknown) {
              return { id: uid, email: null, last_sign_in: null, error };
            }
          })
        );

        for (const result of results) {
          if (result.error) continue;
          emailMap[result.id] = result.email ?? null;
          lastSignInMap[result.id] = result.last_sign_in ?? null;
        }
      }
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.full_name ?? null,
      email: emailMap[row.id] ?? null,
      role: row.role ?? null,
      status: row.status ?? null,
      joinedAt: row.created_at ?? null,
      avatar: row.avatar_url ?? null,
      lastSignIn: lastSignInMap[row.id] ?? null,
    }));
  } catch {
    return [];
  }
}

export type MembersDebug = {
  rows: ProfileRow[];
  emailMap: Record<string, string | null>;
  errors?: unknown[];
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
      const ids = rows.map((row) => row.id).filter(Boolean);
      const results: AdminUserLookup[] = await Promise.all(
        ids.map(async (uid: string) => {
          try {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
            if (error) return { id: uid, email: null, last_sign_in: null, error };
            const email = data?.user?.email ?? null;
            const lastSignIn = data?.user?.last_sign_in_at ?? null;
            return { id: uid, email, last_sign_in: lastSignIn };
          } catch (error: unknown) {
            return { id: uid, email: null, last_sign_in: null, error };
          }
        })
      );

      for (const result of results) {
        if (result.error) {
          debug.errors?.push({ id: result.id, error: result.error });
        }
        debug.emailMap[result.id] = result.email ?? null;
      }
    }

    return debug;
  } catch (error: unknown) {
    debug.errors?.push(error);
    return debug;
  }
}
