import type { User } from "@supabase/supabase-js";

import supabaseAdmin from "@/lib/supabaseServerClient";

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}
