"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Info, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabaseClient";
import Dropdown from "@/components/common/Dropdown";
import PaginationControls from "@/components/common/PaginationControls";
import type { Member } from "@/lib/server/members";

type Props = {
  initialMembers: Member[];
};

type RoleRow = {
  role?: string | null;
};

function toReadableError(value: unknown, fallback = "Could not update status.") {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const maybe = value as { message?: unknown; error?: unknown; details?: unknown };
    if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message;
    if (typeof maybe.error === "string" && maybe.error.trim()) return maybe.error;
    if (typeof maybe.details === "string" && maybe.details.trim()) return maybe.details;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function MembersTable({ initialMembers }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (!active) return;
        setCurrentUserId(uid);
        if (uid) {
          const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).single();
          if (!active) return;
          setCurrentUserRole(((profile as RoleRow | null)?.role ?? null));
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const shortDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
      });
    } catch {
      return d;
    }
  };

  const filtered = useMemo(() => {
    let result = [...members];

    if (roleFilter !== "all") result = result.filter((m) => (m.role ?? "") === roleFilter);
    if (statusFilter !== "all") result = result.filter((m) => (m.status ?? "") === statusFilter);

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((m) => {
        return (
          String(m.name ?? "").toLowerCase().includes(q) ||
          String(m.email ?? "").toLowerCase().includes(q) ||
          String(m.id).includes(q)
        );
      });
    }

    return result;
  }, [members, query, roleFilter, statusFilter]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter, members, perPage]);

  const display = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleStatus = async (id: string, current: string | null) => {
    const next = current === "active" ? "suspended" : "active";
    setPendingIds((s) => [...s, id]);
    try {
      async function authedFetch(url: string, init?: RequestInit) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Not authenticated");
        return fetch(url, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(init?.headers ?? {}),
          },
        });
      }

      const res = await authedFetch("/api/members/toggle", {
        method: "POST",
        body: JSON.stringify({ id, status: next }),
      });

      if (res.ok) {
        setMembers((m) => m.map((x) => (x.id === id ? { ...x, status: next } : x)));
      } else {
        const payload = (await res.json().catch(() => ({}))) as { error?: unknown; message?: unknown; details?: unknown };
        const message = toReadableError(payload.error ?? payload.message ?? payload.details);
        if (res.status === 403) {
          toast.error(message || "Insufficient permission to modify this account");
        } else if (res.status === 401) {
          toast.error("Unauthorized. Please sign in again.");
        } else {
          toast.error(message);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not update status";
      toast.error(message);
    } finally {
      setPendingIds((s) => s.filter((x) => x !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <label className="relative block w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/60 hover:text-foreground/80"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-3 w-full md:w-90">
          <Dropdown
            title="Role"
            id="role"
            name="role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: "all", label: "All Roles" },
              { value: "member", label: "Member" },
              { value: "librarian", label: "Librarian" },
              { value: "admin", label: "Admin" },
            ]}
          />

          <Dropdown
            title="Status"
            id="status"
            name="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "pending", label: "Pending" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase text-foreground/50 dark:border-white/10">
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Last Sign In</th>
            </tr>
          </thead>
          <tbody>
            {display.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-foreground/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="h-6 w-6 opacity-40" />
                    <p>No members found matching your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              display.map((m) => {
                const isSelf = currentUserId === m.id;
                const callerIsAdmin = currentUserRole === "admin";
                const cannotToggleDueRole = !callerIsAdmin && (m.role === "admin" || m.role === "librarian");
                const isDisabled = pendingIds.includes(m.id) || isSelf || cannotToggleDueRole;
                const title = isSelf ? "Cannot modify your own account" : cannotToggleDueRole ? "Only admins can modify this account" : "";

                return (
                  <tr key={m.id} className="border-b border-black/5 last:border-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.avatar} alt={m.name ?? "avatar"} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10" />
                        )}
                        <span className="font-medium text-foreground">{m.name ?? m.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{m.email ?? "-"}</td>
                    <td className="px-4 py-3 capitalize">{m.role ?? "-"}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={isDisabled}
                        title={title}
                        onClick={() => toggleStatus(m.id, m.status)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition 
                          ${m.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"} ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        {m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : "-"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{shortDate(m.joinedAt)}</td>
                    <td className="px-4 py-3 text-foreground/70">{shortDate(m.lastSignIn)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onJump={(p: number) => setPage(p)}
          perPage={perPage}
          onPerPageChange={(n: number) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}

