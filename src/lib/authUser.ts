import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | null;
};

export function isEmailVerified(user: User | null | undefined) {
  if (!user) return false;
  if (user.email_confirmed_at || user.confirmed_at) return true;

  const provider = user.app_metadata?.provider;
  if (provider && provider !== "email") return true;

  return false;
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user || !isEmailVerified(user)) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}
