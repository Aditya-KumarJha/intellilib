import { NextResponse } from "next/server";
import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { getPendingReturnRequests } from "@/lib/server/librarianCirculation";
import { logAuditEvent } from "@/lib/server/auditLogs";
import supabaseAdmin from "@/lib/supabaseServerClient";

type BookRow = {
  id: number;
  title: string | null;
  author: string | null;
  available_copies: number | null;
  total_copies: number | null;
};

type AssistantMessageLike = {
  content?: unknown;
  kwargs?: {
    content?: unknown;
  };
};

type AssistantResultShape = {
  output?: unknown;
  text?: unknown;
  response?: unknown;
  messages?: AssistantMessageLike[];
  output_text?: unknown;
  [key: string]: unknown;
};

const SYSTEM_PROMPT = `You are IntelliLib Librarian Assistant — a strict operational assistant for librarian staff.

Rules:
1) Only librarians and admins can use this assistant. Verify caller role before any action.
2) This assistant can perform inventory management (add/remove copies), view inventory, list and approve return requests, and suspend/activate member accounts.
3) Before performing destructive actions (remove copies, suspend user), clearly confirm intent when the agent's confidence is low.
4) Use the provided tools to fetch facts and perform database updates. Never fabricate IDs or claim actions you did not perform.
5) Keep replies short, operational, and include evidence (e.g., book title and resulting counts) when updating inventory.
6) Log audit events for state-changing operations.
`;

const GREETING_HINTS = [
  "hi",
  "hello",
  "hey",
  "heyy",
  "yo",
  "sup",
  "what's up",
  "whats up",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
];

const INVENTORY_OVERVIEW_HINTS = [
  "what books",
  "which books",
  "books in library",
  "books are in library",
  "show books",
  "list books",
  "catalog",
  "catalogue",
  "inventory",
  "show inventory",
  "library now",
  "books now",
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function isGreetingOnlyMessage(input: string) {
  const normalized = normalizeText(String(input ?? ""));
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 8) return false;
  return GREETING_HINTS.some((hint) => normalized.includes(hint));
}

function buildGreetingReply(name?: string | null) {
  const safeName = String(name ?? "").trim();
  if (safeName) {
    return `Hello ${safeName}. I am IntelliLib Librarian Assistant. I can help with inventory, return requests, and member account actions (suspend/activate). What would you like to do?`;
  }
  return "Hello. I am IntelliLib Librarian Assistant. I can help with inventory, return requests, and member account actions (suspend/activate). What would you like to do?";
}

function isInventoryOverviewQuery(input: string) {
  const normalized = normalizeText(String(input ?? ""));
  if (!normalized) return false;

  const hasHint = INVENTORY_OVERVIEW_HINTS.some((hint) => normalized.includes(hint));
  if (!hasHint) return false;

  const hasActionIntent = ["add", "remove", "suspend", "activate", "approve", "return request"].some((w) =>
    normalized.includes(w),
  );
  return !hasActionIntent;
}

async function buildInventoryOverviewReply(limit = 80) {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,title,author,publisher,published_year,type,available_copies,total_copies")
    .order("title", { ascending: true })
    .limit(Math.min(200, Number(limit || 80)));

  if (error || !data || data.length === 0) {
    return "I could not load the book catalog right now. Please try again in a moment.";
  }

  const lines = data.map((book) => {
    const id = String(book.id ?? "-");
    const title = String(book.title ?? "Untitled");
    const author = String(book.author ?? "Unknown author");
    const publisher = String(book.publisher ?? "Unknown publisher");
    const year = String(book.published_year ?? "N/A");
    const bookType = String(book.type ?? "unknown");
    const available = Number(book.available_copies ?? 0);
    const total = Number(book.total_copies ?? 0);
    return `#${id} | ${title} | ${author} | ${publisher} | ${year} | ${bookType} | ${available}/${total}`;
  });

  return `Current catalog (${data.length} books):\n${lines.join("\n")}`;
}

type InventoryIntent = {
  action: "add" | "remove";
  amount: number;
  title: string;
};

function parseInventoryIntent(input: string): InventoryIntent | null {
  const original = String(input ?? "").trim();
  if (!original) return null;

  const normalized = normalizeText(original);
  const actionMatch = normalized.match(/\b(add|increase|insert|remove|decrease|deduct|subtract)\b/);
  if (!actionMatch) return null;

  const actionWord = String(actionMatch[1]);
  const action: "add" | "remove" = ["remove", "decrease", "deduct", "subtract"].includes(actionWord)
    ? "remove"
    : "add";

  const amountMatch = normalized.match(/\b(\d+)\b/) || normalized.match(/\b(one|a|an|single)\b/);
  let amount = 1;
  if (amountMatch) {
    const rawAmt = String(amountMatch[1]);
    amount = /^[0-9]+$/.test(rawAmt) ? Number(rawAmt) : 1;
  }
  if (!Number.isFinite(amount) || amount <= 0) amount = 1;

  let title = original;
  title = title.replace(/\b(can|could|would|please|pls|kindly|you|u|me|for|to)\b/gi, " ");
  title = title.replace(/\b(add|increase|insert|remove|decrease|deduct|subtract)\b/gi, " ");
  title = title.replace(/\b(\d+|one|a|an|single|copy|copies|book|books|title|of)\b/gi, " ");
  title = title.replace(/["'’`\,\.\?\!:\;\(\)\[\]\{\}]/g, " ").replace(/\s+/g, " ").trim();

  if (!title) return null;
  return { action, amount, title };
}

function sanitizeUserSearchTerm(raw: string) {
  if (!raw) return "";
  let s = String(raw).trim();
  // remove common cruft words the librarian might add when speaking
  s = s.replace(/\b(account|accounts|acc|acct|profile|profiles|user|users|member|members|please|pls|kindly|named|name|called|the|a|an)\b/gi, " ");
  // remove possessive markers and punctuation
  s = s.replace(/["'’`\,\.\?\!:\;\(\)\[\]\{\}]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

type ModerationIntent = {
  action: "suspend" | "activate";
  rawTarget: string;
  normalizedTarget: string;
};

type ProfileCandidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  status: string | null;
  role: string | null;
};

function parseModerationIntent(input: string): ModerationIntent | null {
  const text = String(input ?? "").trim();
  if (!text) return null;

  const match = text.match(/\b(suspend|deactivate|disable|activate|unsuspend|enable|reinstate|unblock)\b([\s\S]*)$/i);
  if (!match) return null;

  const verb = String(match[1] ?? "").toLowerCase();
  const action: "suspend" | "activate" = ["activate", "unsuspend", "enable", "reinstate", "unblock"].includes(verb)
    ? "activate"
    : "suspend";

  const tail = String(match[2] ?? "").trim();
  const cleanedTail = tail
    .replace(/^\s*(?:the\s+)?(?:user|users|member|members|account|accounts|profile|profiles)\s*/i, "")
    .replace(/^\s*(?:id|name|named|called)\s*/i, "")
    .trim();

  const normalizedTarget = sanitizeUserSearchTerm(cleanedTail);
  return { action, rawTarget: cleanedTail, normalizedTarget };
}

async function findUserCandidatesByTerm(rawTerm: string): Promise<ProfileCandidate[]> {
  const normalized = sanitizeUserSearchTerm(rawTerm);
  if (!normalized) return [];

  const rowsById = new Map<string, ProfileCandidate>();
  const addRows = (rows: ProfileCandidate[] | null | undefined) => {
    for (const r of rows ?? []) {
      if (!r?.id) continue;
      rowsById.set(String(r.id), r);
    }
  };

  const selectCols = "id,full_name,email,status,role";

  const { data: exactIdRaw } = await supabaseAdmin.from("profiles").select(selectCols).eq("id", rawTerm).limit(1);
  addRows((exactIdRaw ?? []) as ProfileCandidate[]);

  if (normalized !== rawTerm) {
    const { data: exactIdNormalized } = await supabaseAdmin.from("profiles").select(selectCols).eq("id", normalized).limit(1);
    addRows((exactIdNormalized ?? []) as ProfileCandidate[]);
  }

  const like = `%${normalized}%`;
  const { data: directLikeRows } = await supabaseAdmin
    .from("profiles")
    .select(selectCols)
    .or(`full_name.ilike.${like},email.ilike.${like},id.ilike.${like}`)
    .limit(24);
  addRows((directLikeRows ?? []) as ProfileCandidate[]);

  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2);
  for (const token of tokens) {
    const tokenLike = `%${token}%`;
    const { data: tokenRows } = await supabaseAdmin
      .from("profiles")
      .select(selectCols)
      .or(`full_name.ilike.${tokenLike},email.ilike.${tokenLike},id.ilike.${tokenLike}`)
      .limit(24);
    addRows((tokenRows ?? []) as ProfileCandidate[]);
  }

  return [...rowsById.values()];
}

function isStaffCandidate(candidate: ProfileCandidate) {
  return candidate.role === "librarian" || candidate.role === "admin";
}

function scoreCandidateForTerm(candidate: ProfileCandidate, term: string) {
  const normalizedTerm = sanitizeUserSearchTerm(term);
  const name = normalizeText(String(candidate.full_name ?? ""));
  const email = normalizeText(String(candidate.email ?? ""));
  const id = normalizeText(String(candidate.id ?? ""));
  const pieces = [name, email, id].filter(Boolean);

  let score = 0;
  for (const piece of pieces) {
    if (piece === normalizedTerm) score += 3.0;
    else if (piece.startsWith(normalizedTerm)) score += 2.3;
    else if (piece.includes(normalizedTerm)) score += 1.8;
  }

  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length < 2) continue;
    for (const piece of pieces) {
      if (piece === token) score += 1.2;
      else if (piece.startsWith(token)) score += 0.8;
      else if (piece.includes(token)) score += 0.45;
    }
  }

  return score;
}

function rankUserCandidates(term: string, candidates: ProfileCandidate[]) {
  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreCandidateForTerm(candidate, term) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function shouldAutoSelectTopCandidate(scored: Array<{ candidate: ProfileCandidate; score: number }>) {
  if (scored.length === 1) return true;
  if (scored.length < 2) return false;
  const top = scored[0].score;
  const second = scored[1].score;
  return top >= 2.4 && top - second >= 0.7;
}

function formatBookRow(row: BookRow) {
  const title = String(row.title ?? "Untitled");
  const author = String(row.author ?? "Unknown");
  const available = Number(row.available_copies ?? 0);
  const total = Number(row.total_copies ?? 0);
  return `${title} | ${author} | ${available}/${total}`;
}

async function fetchCandidateBooks(query: string) {
  const safe = String(query ?? "").trim();
  if (!safe) return [];
  const like = `%${safe}%`;
  const { data } = await supabaseAdmin
    .from("books")
    .select("id,title,author,available_copies,total_copies")
    .or(`title.ilike.${like},author.ilike.${like}`)
    .limit(60);
  return (data ?? []) as BookRow[];
}

async function incrementBookCopies(bookId: number, delta: number) {
  const { data } = await supabaseAdmin
    .from("books")
    .select("id,title,author,available_copies,total_copies")
    .eq("id", bookId)
    .maybeSingle();

  if (!data) return null;

  const newTotal = Math.max(0, Number(data.total_copies ?? 0) + delta);
  const newAvailable = Math.max(0, Number(data.available_copies ?? 0) + delta);

  const { data: updated } = await supabaseAdmin
    .from("books")
    .update({ total_copies: newTotal, available_copies: newAvailable })
    .eq("id", bookId)
    .select("id,title,author,available_copies,total_copies")
    .maybeSingle();

  return updated;
}

async function suspendUserById(userId: string, byId: string) {
  // Prevent suspending staff accounts
  const { data: existing } = await supabaseAdmin.from("profiles").select("id,full_name,role,status").eq("id", userId).maybeSingle();
  if (!existing) return null;
  if (existing.role === "librarian" || existing.role === "admin") return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ status: "suspended" })
    .eq("id", userId)
    .select("id,full_name,status")
    .maybeSingle();

  if (!data || error) return null;
  await logAuditEvent({ userId: byId, action: "suspend_user", entity: "profile", entityId: 0, metadata: { targetUserId: userId } });
  return data;
}

async function activateUserById(userId: string, byId: string) {
  // Prevent activating staff role changes via this assistant (no-op for librarians/admins)
  const { data: existing } = await supabaseAdmin.from("profiles").select("id,full_name,role,status").eq("id", userId).maybeSingle();
  if (!existing) return null;
  if (existing.role === "librarian" || existing.role === "admin") return null;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ status: null })
    .eq("id", userId)
    .select("id,full_name,status")
    .maybeSingle();

  if (!data || error) return null;
  await logAuditEvent({ userId: byId, action: "activate_user", entity: "profile", entityId: 0, metadata: { targetUserId: userId } });
  return data;
}

async function approveReturnRequest(returnRequestId: number, processedBy: string) {
  if (!Number.isFinite(returnRequestId) || returnRequestId <= 0) return null;

  const { data: requestRow } = await supabaseAdmin.from("return_requests").select("id,transaction_id,status").eq("id", returnRequestId).maybeSingle();
  if (!requestRow || requestRow.status !== "pending") return null;

  const txId = Number(requestRow.transaction_id);
  const nowIso = new Date().toISOString();

  const { data: updatedTx } = await supabaseAdmin.from("transactions").update({ return_date: nowIso, status: "returned" }).eq("id", txId).is("return_date", null).select("id,user_id").maybeSingle();

  await supabaseAdmin.from("return_requests").update({ status: "approved", processed_at: nowIso, processed_by: processedBy }).eq("id", returnRequestId);

  await logAuditEvent({ userId: processedBy, action: "approve_return", entity: "return_request", entityId: returnRequestId, metadata: { transactionId: txId } });

  return { updatedTx, requestId: returnRequestId };
}

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "librarian";
}

function toModelMessages(messages: { role: string; content: string }[]): BaseMessage[] {
  return messages.slice(-16).map((m) => (m.role === "assistant" ? new AIMessage(m.content) : new HumanMessage(m.content)));
}

function extractAssistantText(result: unknown): string {
  // Try common shapes returned by langgraph/langchain agents and fall back to stringified JSON
  if (!result) return "";
  try {
    // If it's already a string
    if (typeof result === "string") return result;

    const obj = result as AssistantResultShape;

    // If agent returns an AIMessage-like object
    if (obj instanceof AIMessage && typeof obj.content === "string") return obj.content;

    // Check common keys
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.response === "string") return obj.response;

    // Some agent libs return an object with messages array
    if (Array.isArray(obj.messages)) {
      // find last AIMessage-like entry
      for (let i = obj.messages.length - 1; i >= 0; i -= 1) {
        const m = obj.messages[i];
        if (!m) continue;
        if (typeof m.content === "string") return m.content;
        if (m.kwargs && typeof m.kwargs.content === "string") return m.kwargs.content;
      }
    }

    // Some results embed output_text
    if (typeof obj.output_text === "string") return obj.output_text;

    // Fallback: try to find any string-valued property
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === "string") return obj[k];
    }

    return JSON.stringify(obj);
  } catch {
    return String(result ?? "");
  }
}

function createTools(userId: string) {
  const searchBooks = tool(
    async ({ query }: { query: string }) => {
      const books = await fetchCandidateBooks(query);
      if (!books.length) return "No matches found.";
      const lines = books.slice(0, 8).map((b) => formatBookRow(b));
      return `Matches:\n${lines.join("\n")}`;
    },
    {
      name: "search_books",
      description: "Search books by title or author.",
      schema: z.object({ query: z.string().min(1) }),
    },
  );

  const listInventory = tool(
    async ({ limit = 20 }: { limit?: number }) => {
      const { data } = await supabaseAdmin
        .from("books")
        .select("id,title,author,available_copies,total_copies")
        .order("available_copies", { ascending: false })
        .limit(Math.min(200, Number(limit || 20)));
      const rows = (data ?? []) as BookRow[];
      return rows.map(formatBookRow).slice(0, 50).join("\n");
    },
    {
      name: "list_inventory",
      description: "List inventory summary ordered by available copies.",
      schema: z.object({ limit: z.number().optional() }),
    },
  );

  const addCopiesTool = tool(
    async ({ book_id, query, amount }: { book_id?: number; query?: string; amount: number }) => {
      let book: BookRow | null = null;
      if (book_id) {
        const { data } = await supabaseAdmin.from("books").select("id,title,author,available_copies,total_copies").eq("id", book_id).maybeSingle();
        book = (data as BookRow | null) ?? null;
      } else if (query) {
        const candidates = await fetchCandidateBooks(query);
        book = candidates[0] ?? null;
      }

      if (!book) return `Book not found for ${book_id ?? query}`;
      const updated = await incrementBookCopies(Number(book.id), Number(amount));
      return `Updated: ${formatBookRow(updated ?? book)}`;
    },
    {
      name: "add_copies",
      description: "Add inventory copies for a book by id or title hint.",
      schema: z.object({ book_id: z.number().optional(), query: z.string().optional(), amount: z.number().min(1) }),
    },
  );

  const removeCopiesTool = tool(
    async ({ book_id, query, amount }: { book_id?: number; query?: string; amount: number }) => {
      let book: BookRow | null = null;
      if (book_id) {
        const { data } = await supabaseAdmin.from("books").select("id,title,author,available_copies,total_copies").eq("id", book_id).maybeSingle();
        book = (data as BookRow | null) ?? null;
      } else if (query) {
        const candidates = await fetchCandidateBooks(query);
        book = candidates[0] ?? null;
      }

      if (!book) return `Book not found for ${book_id ?? query}`;
      const updated = await incrementBookCopies(Number(book.id), -Math.abs(Number(amount)));
      return `Updated: ${formatBookRow(updated ?? book)}`;
    },
    {
      name: "remove_copies",
      description: "Remove inventory copies for a book by id or title hint.",
      schema: z.object({ book_id: z.number().optional(), query: z.string().optional(), amount: z.number().min(1) }),
    },
  );

  const listReturnRequestsTool = tool(
    async ({ limit = 50 }: { limit?: number }) => {
      const rows = await getPendingReturnRequests(Math.min(200, Number(limit || 50)));
      if (!rows.length) return "No pending return requests.";
      return rows.map((r) => `#${r.id}: ${r.bookTitle} — ${r.requestedByName} (${r.requestedByUserId})`).join("\n");
    },
    { name: "list_return_requests", description: "List pending return requests.", schema: z.object({ limit: z.number().optional() }) },
  );

  const approveReturnTool = tool(
    async ({ return_request_id }: { return_request_id: number }) => {
      const res = await approveReturnRequest(Number(return_request_id), userId);
      if (!res) return `Could not approve return request ${return_request_id}.`;
      return `Approved return request ${return_request_id}.`;
    },
    { name: "approve_return", description: "Approve a pending return request by id.", schema: z.object({ return_request_id: z.number().min(1) }) },
  );

  const suspendUserTool = tool(
    async ({ user_id }: { user_id: string }) => {
      const row = await suspendUserById(String(user_id), userId);
      if (!row) return `Could not suspend ${user_id}`;
      return `Suspended ${row.full_name ?? user_id}`;
    },
    { name: "suspend_user", description: "Suspend a member account.", schema: z.object({ user_id: z.string().min(1) }) },
  );

  const activateUserTool = tool(
    async ({ user_id }: { user_id: string }) => {
      const row = await activateUserById(String(user_id), userId);
      if (!row) return `Could not activate ${user_id}`;
      return `Activated ${row.full_name ?? user_id}`;
    },
    { name: "activate_user", description: "Activate a suspended member account.", schema: z.object({ user_id: z.string().min(1) }) },
  );

  return [
    searchBooks,
    listInventory,
    addCopiesTool,
    removeCopiesTool,
    listReturnRequestsTool,
    approveReturnTool,
    suspendUserTool,
    activateUserTool,
  ];
}

export async function POST(req: Request) {
  const caller = await getUserFromRequest(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabaseAdmin.from("profiles").select("id,role,full_name").eq("id", caller.id).maybeSingle();
  if (!callerProfile || !isStaffRole(callerProfile.role)) {
    return NextResponse.json({ error: "Only librarians and admins can use this assistant." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const latestUserMessage = messages.length ? messages[messages.length - 1].content : "";

  if (!latestUserMessage || !normalizeText(String(latestUserMessage))) {
    return NextResponse.json({ ok: true, reply: "Please ask a librarian-related question or command." });
  }

  if (isGreetingOnlyMessage(String(latestUserMessage))) {
    return NextResponse.json({ ok: true, reply: buildGreetingReply(callerProfile.full_name) });
  }

  if (isInventoryOverviewQuery(String(latestUserMessage))) {
    const reply = await buildInventoryOverviewReply(100);
    return NextResponse.json({ ok: true, reply });
  }

  // Pre-handle certain direct commands to support disambiguation flows before invoking the agent.
  try {
    // Expand deterministic pre-handling for common operations to avoid agent recursion
    const moderationIntent = parseModerationIntent(String(latestUserMessage));
    if (moderationIntent) {
      // If no target was actually provided, then treat this as a capability question.
      if (!moderationIntent.normalizedTarget) {
        return NextResponse.json({ ok: true, reply: "Yes — I can suspend or activate user accounts. Please provide the user's full name, email, or id (for example: 'Suspend meera account' or 'activate user user_abc123')." });
      }

      const rankedAll = rankUserCandidates(moderationIntent.normalizedTarget, await findUserCandidatesByTerm(moderationIntent.rawTarget));
      if (!rankedAll.length) {
        return NextResponse.json({ ok: true, reply: `No users found matching "${moderationIntent.rawTarget || moderationIntent.normalizedTarget}". Try full name, email, or id.` });
      }

      const ranked = rankedAll.filter((x) => !isStaffCandidate(x.candidate));
      if (!ranked.length) {
        const staff = rankedAll[0]?.candidate;
        return NextResponse.json({ ok: true, reply: `Matched ${staff?.full_name ?? staff?.id ?? "that account"}, but staff accounts (admin/librarian) cannot be ${moderationIntent.action}ed via this assistant.` });
      }

      if (shouldAutoSelectTopCandidate(ranked)) {
        const top = ranked[0].candidate;
        const result = moderationIntent.action === "suspend" ? await suspendUserById(String(top.id), caller.id) : await activateUserById(String(top.id), caller.id);
        if (!result) {
          return NextResponse.json({ ok: true, reply: `Could not ${moderationIntent.action} ${top.full_name ?? top.id}.` });
        }
        return NextResponse.json({ ok: true, reply: `User ${result.full_name ?? top.id} ${moderationIntent.action === "suspend" ? "suspended" : "activated"}.` });
      }

      return NextResponse.json({
        ok: true,
        replyType: "choose_user",
        action: moderationIntent.action === "suspend" ? "suspend_user" : "activate_user",
        candidates: ranked.slice(0, 12).map((x) => ({ id: x.candidate.id, full_name: x.candidate.full_name, email: x.candidate.email, status: x.candidate.status })),
      });
    }

    // Detect capability queries where no specific target is present
    const capabilitySuspendMatch = latestUserMessage.match(/\b(?:can|could|would|are)\b[\s\w]{0,40}?\b(?:you|u)\b[\s\w]{0,40}?\b(suspend|deactivate|disable|activate|unsuspend|enable)\b[\s\w]{0,40}?\b(?:user|account|member)\b/i);
    if (capabilitySuspendMatch) {
      return NextResponse.json({ ok: true, reply: "Yes — I can suspend or activate user accounts. Please provide the user's full name, email, or id (for example: 'Suspend meera account' or 'activate user user_abc123')." });
    }
    // Handle list/show users queries deterministically to avoid agent recursion
    const listUsersMatch = latestUserMessage.match(/\b(list|show|send)\b[\s\w]{0,40}?\b(all\s+)?(users|user\s+accounts|members)\b/i);
    if (listUsersMatch) {
      const { data: rows } = await supabaseAdmin
        .from("profiles")
        .select("id,full_name,email,status,role")
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .limit(500);
      const users = (rows ?? []) as ProfileCandidate[];
      if (!users.length) return NextResponse.json({ ok: true, reply: "No users found." });
      const lines = users.map((u) => `${u.full_name ?? u.id} — ${u.id}${u.email ? ` — ${u.email}` : ""} — ${u.status ?? "active"}`);
      return NextResponse.json({ ok: true, reply: lines.join("\n") });
    }
    // add/remove copies with robust natural language handling
    const inventoryIntent = parseInventoryIntent(String(latestUserMessage));
    if (inventoryIntent) {
      const { action, amount, title } = inventoryIntent;

      const candidates = await fetchCandidateBooks(title);
      if (!candidates.length) return NextResponse.json({ ok: true, reply: `No book found matching "${title}".` });
      if (candidates.length === 1) {
        const book = candidates[0];
        const delta = action === "add" ? amount : -amount;
        const updated = await incrementBookCopies(Number(book.id), delta);
        return NextResponse.json({ ok: true, reply: `Updated ${book.title}: ${formatBookRow(updated ?? book)}` });
      }

      return NextResponse.json({ ok: true, replyType: "choose_book", action: action === "add" ? "add_copies" : "remove_copies", amount, candidates: candidates.slice(0, 12).map((b) => ({ id: b.id, title: b.title, author: b.author, available_copies: b.available_copies, total_copies: b.total_copies })) });
    }

    // approve return: 'approve return 123' or 'approve return request 123'
    const approveMatch = latestUserMessage.match(/\bapprove\s+return\s+(?:request\s+)?#?(\d+)$/i);
    if (approveMatch) {
      const reqId = Number(approveMatch[1]);
      if (!Number.isFinite(reqId) || reqId <= 0) return NextResponse.json({ ok: true, reply: "Please provide a valid return request id." });
      const res = await approveReturnRequest(reqId, caller.id);
      if (!res) return NextResponse.json({ ok: true, reply: `Could not approve return request ${reqId}.` });
      return NextResponse.json({ ok: true, reply: `Return request ${reqId} approved.` });
    }
  } catch (error) {
    // If pre-handling fails, return a helpful message rather than falling through to the agent to avoid recursion issues.
    console.error("Prehandle error:", error);
    return NextResponse.json({ ok: false, reply: "Could not process your request deterministically; please try rephrasing or run the command by id." });
  }

  const model = new ChatGroq({ model: "llama-3.3-70b-versatile", apiKey: process.env.GROQ_API_KEY, temperature: 0.1 });
  const tools = createTools(caller.id);
  const agent = createReactAgent({ llm: model, tools, prompt: SYSTEM_PROMPT });

  try {
    // Inject authenticated caller metadata to avoid agent asking for role verification
    const callerMeta = `Caller: id=${caller.id} role=${callerProfile.role} full_name=${callerProfile.full_name ?? ""}`;
    const modelMessages = [new HumanMessage(callerMeta), ...toModelMessages(messages)];
    const result = await agent.invoke({ messages: modelMessages }, { recursionLimit: 4 });
    const reply = extractAssistantText(result) || "No reply from assistant.";

    try {
      await supabaseAdmin.from("ai_queries").insert({ user_id: caller.id, query: latestUserMessage, response: reply, context: { source: "librarian-assistant" } }).throwOnError();
    } catch {
      // ignore analytics failures
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error: unknown) {
    console.error("Librarian assistant failed:", error);
    // Detect recursion errors from langgraph and return a helpful assistant-style reply instead of 500.
    try {
      const maybeError = error as { lc_error_code?: unknown; code?: unknown; message?: unknown };
      const code = String(maybeError.lc_error_code ?? maybeError.code ?? "");
      const msg = String(maybeError.message ?? error ?? "");
      if (code === "GRAPH_RECURSION_LIMIT" || msg.includes("Recursion limit")) {
        return NextResponse.json({ ok: true, reply: "Assistant reached its recursion limit while trying to answer. Please try a direct command (for example: 'Suspend user <user_id>' or 'Add 3 copies of <book title>') or select the matching candidate when prompted." });
      }
    } catch {
      // ignore
    }

    const normalized = normalizeText(String(latestUserMessage));
    if (normalized.includes("book") || normalized.includes("catalog") || normalized.includes("inventory") || normalized.includes("library")) {
      const fallbackReply = await buildInventoryOverviewReply(50);
      return NextResponse.json({ ok: true, reply: fallbackReply });
    }

    return NextResponse.json({ ok: true, reply: "Assistant could not complete that request right now. Try a direct command like 'show inventory overview', 'add 1 copy of Clean Code', or 'suspend user <user_id>'." });
  }
}
