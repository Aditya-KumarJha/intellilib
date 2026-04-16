"use client";

import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { toAuthUser, type AuthUser } from "@/lib/authUser";

export type UserRole = "admin" | "librarian" | "user";

type AuthState = {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthLoading: boolean;
  isRoleLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (u: AuthUser | null) => void;
  clearUser: () => void;
  init: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthLoading: true,
  isRoleLoading: false,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (u) => set({ user: u, isAuthenticated: !!u }),
  clearUser: () =>
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      isRoleLoading: false,
      isAuthLoading: false,
    }),
  init: () => {
    if (get().isInitialized) {
      return;
    }

    set({ isAuthLoading: true });

    const hydrateUser = async (authUser: AuthUser | null) => {
      if (!authUser) {
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          isRoleLoading: false,
          isAuthLoading: false,
        });
        return;
      }

      set({ user: authUser, isAuthenticated: true, isRoleLoading: true });

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();

        if (error) {
          set({ role: "user", isRoleLoading: false, isAuthLoading: false });
          return;
        }

        const role = (data?.role ?? "user") as UserRole;
        set({ role, isRoleLoading: false, isAuthLoading: false });
      } catch {
        set({ role: "user", isRoleLoading: false, isAuthLoading: false });
      }
    };

    // subscribe to supabase auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      const authUser = toAuthUser(session?.user);
      void hydrateUser(authUser);
    });

    // try to get current user immediately
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const authUser = toAuthUser(data?.session?.user ?? null);
        await hydrateUser(authUser);
      } catch {
        set({ isAuthLoading: false });
      } finally {
        set({ isInitialized: true });
      }
    })();
  },
}));

export default useAuthStore;
