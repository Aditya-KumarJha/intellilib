"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { toAuthUser, type AuthUser } from "@/lib/authUser";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (u: AuthUser | null) => void;
  clearUser: () => void;
  init: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (u) => set({ user: u, isAuthenticated: !!u }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
  init: () => {
    // subscribe to supabase auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      const user = toAuthUser(session?.user);
      if (user) {
        set({ user, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    });

    // try to get current user immediately
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = toAuthUser(data?.user);
        if (user) {
          set({ user, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      } catch {
        // ignore
      }
    })();
  },
}));

export default useAuthStore;
