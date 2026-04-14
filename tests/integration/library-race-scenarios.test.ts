import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryCall = { method: string; args: unknown[] };
type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

type MockState = {
  user: { id: string; email?: string } | null;
  notify: ReturnType<typeof vi.fn>;
  audit: ReturnType<typeof vi.fn>;
  getPhysicalAvailableCopyIds: ReturnType<typeof vi.fn>;
  getApprovedReservationForUser: ReturnType<typeof vi.fn>;
  hasApprovedReservationForAnotherUser: ReturnType<typeof vi.fn>;
  getIssueDurationDays: ReturnType<typeof vi.fn>;
  getMaxBooksPerUser: ReturnType<typeof vi.fn>;
  fromResolver: (table: string, calls: QueryCall[]) => QueryResult | Promise<QueryResult>;
  getUserById: ReturnType<typeof vi.fn>;
};

const state: MockState = {
  user: { id: "user-1", email: "member@example.com" },
  notify: vi.fn(async () => undefined),
  audit: vi.fn(async () => undefined),
  getPhysicalAvailableCopyIds: vi.fn(async () => []),
  getApprovedReservationForUser: vi.fn(async () => null),
  hasApprovedReservationForAnotherUser: vi.fn(async () => false),
  getIssueDurationDays: vi.fn(async () => 14),
  getMaxBooksPerUser: vi.fn(async () => 3),
  fromResolver: () => ({ data: [] }),
  getUserById: vi.fn(async () => ({ data: { user: { email: "member@example.com" } } })),
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
  compactQueuePositions: vi.fn(async () => undefined),
  getApprovedReservationForUser: (...args: unknown[]) => state.getApprovedReservationForUser(...args),
  getIssueDurationDays: (...args: unknown[]) => state.getIssueDurationDays(...args),
  getMaxBooksPerUser: (...args: unknown[]) => state.getMaxBooksPerUser(...args),
  getPhysicalAvailableCopyIds: (...args: unknown[]) => state.getPhysicalAvailableCopyIds(...args),
  hasApprovedReservationForAnotherUser: (...args: unknown[]) => state.hasApprovedReservationForAnotherUser(...args),
}));

vi.mock("@/lib/supabaseServerClient", () => ({
  default: {
    from: (table: string) => createQuery(table),
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => state.getUserById(...args),
      },
    },
  },
}));

describe("Library API race and idempotency scenarios", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    state.user = { id: "user-1", email: "member@example.com" };
    state.notify = vi.fn(async () => undefined);
    state.audit = vi.fn(async () => undefined);
    state.getPhysicalAvailableCopyIds = vi.fn(async () => []);
    state.getApprovedReservationForUser = vi.fn(async () => null);
    state.hasApprovedReservationForAnotherUser = vi.fn(async () => false);
    state.getIssueDurationDays = vi.fn(async () => 14);
    state.getMaxBooksPerUser = vi.fn(async () => 3);
    state.fromResolver = () => ({ data: [] });
    state.getUserById = vi.fn(async () => ({ data: { user: { email: "member@example.com" } } }));
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("issue API returns 409 when all candidate copies are lost to race", async () => {
    state.getPhysicalAvailableCopyIds = vi.fn(async () => [101, 102]);

    let transactionInsertAttempt = 0;
    state.fromResolver = (table, calls) => {
      if (table === "books") {
        return { data: { id: 1, title: "Clean Code", type: "physical", pdf_url: null }, error: null };
      }

      if (table === "transactions") {
        const hasInsert = calls.some((c) => c.method === "insert");
        const hasBookCopiesJoin = calls.some((c) =>
          c.method === "select" && String(c.args[0]).includes("book_copies!inner(book_id)"),
        );

        if (!hasInsert && hasBookCopiesJoin) {
          return { data: [] };
        }

        if (!hasInsert) {
          return { data: [] };
        }

        transactionInsertAttempt += 1;
        return {
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint unique_active_issue",
            details: "race",
          },
        };
      }

      return { data: [] };
    };

    const { POST } = await import("@/app/api/library/issue/route");
    const req = new Request("http://localhost/api/library/issue", {
      method: "POST",
      body: JSON.stringify({ bookId: 1 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.canReserve).toBe(true);
    expect(transactionInsertAttempt).toBe(2);
  });

  it("reservations API retries queue insert on uniqueness race and succeeds", async () => {
    let reservationInsertAttempt = 0;

    state.getPhysicalAvailableCopyIds = vi.fn(async () => []);
    state.fromResolver = (table, calls) => {
      if (table === "books") {
        return { data: { id: 11, title: "Distributed Systems", type: "physical" }, error: null };
      }

      if (table === "transactions") {
        return { data: [] };
      }

      if (table === "reservations") {
        const hasInsert = calls.some((c) => c.method === "insert");
        const maybeSingleCount = calls.filter((c) => c.method === "maybeSingle").length;

        if (!hasInsert && maybeSingleCount > 0) {
          const hasStatusFilter = calls.some((c) => c.method === "in" && String(c.args[0]) === "status");
          if (hasStatusFilter) {
            return { data: null };
          }
          return { data: { queue_position: 3 } };
        }

        if (hasInsert) {
          reservationInsertAttempt += 1;
          if (reservationInsertAttempt === 1) {
            return {
              data: null,
              error: {
                code: "23505",
                message: "duplicate key value violates unique constraint unique_queue_position",
                details: "race",
              },
            };
          }
          return { data: { id: 88, queue_position: 4 }, error: null };
        }
      }

      return { data: [] };
    };

    const { POST } = await import("@/app/api/library/reservations/route");
    const req = new Request("http://localhost/api/library/reservations", {
      method: "POST",
      body: JSON.stringify({ bookId: 11 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.reservation?.queue_position).toBe(4);
    expect(reservationInsertAttempt).toBe(2);
  });

  it("returns API is idempotent when pending return request already exists", async () => {
    state.fromResolver = (table, calls) => {
      if (table === "transactions") {
        return {
          data: {
            id: 5,
            user_id: "user-1",
            return_date: null,
            book_copy_id: 20,
            book_copies: { book_id: 9, books: { id: 9, title: "Clean Architecture" } },
          },
          error: null,
        };
      }

      if (table === "return_requests") {
        const hasInsert = calls.some((c) => c.method === "insert");
        if (!hasInsert) {
          return { data: { id: 999 }, error: null };
        }
        return { data: null, error: null };
      }

      return { data: [] };
    };

    const { POST } = await import("@/app/api/library/returns/route");
    const req = new Request("http://localhost/api/library/returns", {
      method: "POST",
      body: JSON.stringify({ transactionId: 5, mode: "request" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.inProcess).toBe(true);
    expect(String(body.message).toLowerCase()).toContain("already in process");
  });

  it("payment verify is idempotent for already successful order", async () => {
    vi.stubEnv("RZP_KEY_ID", "rzp_test");
    vi.stubEnv("RZP_KEY_SECRET", "secret");

    const orderId = "order_123";
    const paymentId = "pay_123";
    const signature = crypto.createHmac("sha256", "secret").update(`${orderId}|${paymentId}`).digest("hex");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ id: orderId, notes: { user_id: "user-1", fine_ids: "1,2" } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    state.fromResolver = (table, calls) => {
      if (table === "payments") {
        const hasMaybeSingle = calls.some((c) => c.method === "maybeSingle");
        if (hasMaybeSingle) {
          return { data: { id: 42, status: "success" }, error: null };
        }
      }
      return { data: [], error: null };
    };

    const { POST } = await import("@/app/api/razorpay/verify/route");
    const req = new Request("http://localhost/api/razorpay/verify", {
      method: "POST",
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.alreadyProcessed).toBe(true);
  });
});
