import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = { method: string; args: unknown[] };
type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

type MockState = {
  user: { id: string; email?: string } | null;
  notify: ReturnType<typeof vi.fn>;
  audit: ReturnType<typeof vi.fn>;
  compact: ReturnType<typeof vi.fn>;
  fromResolver: (table: string, calls: QueryCall[]) => QueryResult | Promise<QueryResult>;
};

const state: MockState = {
  user: { id: "staff-1", email: "librarian@example.com" },
  notify: vi.fn(async () => undefined),
  audit: vi.fn(async () => undefined),
  compact: vi.fn(async () => undefined),
  fromResolver: () => ({ data: [] }),
};

function createQuery(table: string, calls: QueryCall[] = []) {
  const proxy = new Proxy(
    {},
    {
      get(_target, propKey) {
        const method = String(propKey);

        if (method === "then") {
          return (resolve: (value: QueryResult) => void, reject?: (error: unknown) => void) => {
            Promise.resolve(state.fromResolver(table, calls)).then(resolve, reject);
          };
        }

        return (...args: unknown[]) => {
          const nextCalls = [...calls, { method, args }];
          if (method === "maybeSingle") {
            return Promise.resolve(state.fromResolver(table, nextCalls));
          }
          return createQuery(table, nextCalls);
        };
      },
    },
  );

  return proxy as unknown as {
    [key: string]: (...args: unknown[]) => unknown;
    then: (resolve: (value: QueryResult) => void, reject?: (error: unknown) => void) => void;
  };
}

vi.mock("@/lib/server/apiAuth", () => ({
  getUserFromRequest: vi.fn(async () => state.user),
}));

vi.mock("@/lib/server/libraryNotifications", () => ({
  notifyUserById: (...args: unknown[]) => state.notify(...args),
}));

vi.mock("@/lib/server/auditLogs", () => ({
  logAuditEvent: (...args: unknown[]) => state.audit(...args),
}));

vi.mock("@/lib/server/reservationService", () => ({
  compactQueuePositions: (...args: unknown[]) => state.compact(...args),
}));

vi.mock("@/lib/supabaseServerClient", () => ({
  default: {
    from: (table: string) => createQuery(table),
  },
}));

describe("librarian request moderation route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.user = { id: "staff-1", email: "librarian@example.com" };
    state.notify = vi.fn(async () => undefined);
    state.audit = vi.fn(async () => undefined);
    state.compact = vi.fn(async () => undefined);
    state.fromResolver = () => ({ data: [] });
  });

  it("cancels an active reservation and compacts the queue", async () => {
    state.fromResolver = (table, calls) => {
      if (table === "profiles") {
        return { data: { id: "staff-1", role: "librarian", full_name: "Desk Staff" }, error: null };
      }

      if (table === "reservations") {
        const hasUpdate = calls.some((call) => call.method === "update");
        if (!hasUpdate) {
          return {
            data: { id: 10, user_id: "user-1", book_id: 7, status: "waiting" },
            error: null,
          };
        }

        return { data: null, error: null };
      }

      if (table === "books") {
        return { data: { title: "Clean Code" }, error: null };
      }

      return { data: [] };
    };

    const { POST } = await import("@/app/api/librarian/requests/route");
    const req = new Request("http://localhost/api/librarian/requests", {
      method: "POST",
      body: JSON.stringify({ action: "cancel_reservation", reservationId: 10 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(state.compact).toHaveBeenCalledWith(7);
    expect(state.notify).toHaveBeenCalledTimes(1);
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "librarian_reservation_cancelled",
        entity: "reservation",
        entityId: 10,
      }),
    );
  });

  it("rejects a pending return request and notifies the user", async () => {
    state.fromResolver = (table, calls) => {
      if (table === "profiles") {
        return { data: { id: "staff-1", role: "admin", full_name: "Admin" }, error: null };
      }

      if (table === "return_requests") {
        const hasUpdate = calls.some((call) => call.method === "update");
        if (!hasUpdate) {
          return {
            data: {
              id: 55,
              transaction_id: 91,
              user_id: "user-5",
              status: "pending",
            },
            error: null,
          };
        }

        return { data: null, error: null };
      }

      if (table === "transactions") {
        return {
          data: {
            book_copies: { books: { id: 4, title: "Designing Data-Intensive Applications" } },
          },
          error: null,
        };
      }

      return { data: [] };
    };

    const { POST } = await import("@/app/api/librarian/requests/route");
    const req = new Request("http://localhost/api/librarian/requests", {
      method: "POST",
      body: JSON.stringify({ action: "reject_return_request", returnRequestId: 55, notes: "Please return at the desk." }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(state.notify).toHaveBeenCalledWith(
      "user-5",
      expect.objectContaining({
        subject: "IntelliLib: Return Request Update",
      }),
    );
    expect(state.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "librarian_return_request_rejected",
        entity: "return_request",
        entityId: 55,
      }),
    );
  });
});
