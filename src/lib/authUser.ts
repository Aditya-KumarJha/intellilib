import type { User } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | null;
};

export function isEmailVerified(user: User | null | undefined) {
  return Boolean(user?.email_confirmed_at);
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
