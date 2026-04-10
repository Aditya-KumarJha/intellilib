"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";

type User = {
  id: string;
  email: string | null;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (u: User | null) => void;
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
      if (session?.user) {
        set({ user: { id: session.user.id, email: session.user.email ?? null }, isAuthenticated: true });
      } else {
        set({ user: null, isAuthenticated: false });
      }
    });

    // try to get current user immediately
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          set({ user: { id: data.user.id, email: data.user.email ?? null }, isAuthenticated: true });
        }
      } catch (e) {
        // ignore
      }
    })();
  },
}));

export default useAuthStore;
