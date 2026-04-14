import { NextResponse } from "next/server";
import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import {
  compactQueuePositions,
  getApprovedReservationForUser,
  getIssueDurationDays,
  getMaxBooksPerUser,
  getPhysicalAvailableCopyIds,
  hasApprovedReservationForAnotherUser,
} from "@/lib/server/reservationService";
import supabaseAdmin from "@/lib/supabaseServerClient";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type AssistantBody = {
  messages?: ChatMessage[];
};

type BookRow = {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  publisher: string | null;
  published_year: number | null;
  isbn: string | null;
  type: string | null;
  available_copies: number | null;
  total_copies: number | null;
};

const MAX_HISTORY = 16;

const REFUSAL_MESSAGE =
  "I am IntelliLib's library assistant. I can only help with library operations like searching books, checking availability, issue/return/reservations, fines, and your library account activity.";

const GENERIC_ASSISTANT_ERROR_MESSAGE =
  "I could not complete that request right now. Please try again in a moment.";

const DOMAIN_HINTS = [
  "book",
  "books",
  "library",
  "issue",
  "return",
  "reserve",
  "reservation",
  "queue",
  "author",
  "title",
  "publisher",
  "isbn",
  "copy",
  "available",
  "availability",
  "loan",
  "fine",
  "payment",
  "catalog",
  "intellilib",
  "my books",
  "smart search",
  "borrow",
  "due",
  "overdue",
  "history",
];

const SYSTEM_PROMPT = `You are IntelliLib Assistant, a strict domain assistant for the IntelliLib platform.

Rules:
1) You are allowed to help only with IntelliLib domain tasks: books, catalog metadata, availability, issue/return/reservations, queue status, fines/payments, user loans, and dashboard-related library actions.
2) If user asks anything outside IntelliLib domain (coding exercises, geography, politics, math unrelated to library usage, general trivia), politely refuse with this exact sentence:
${REFUSAL_MESSAGE}
3) Use tools whenever facts are needed. Never invent database records.
4) For spelling mistakes in book names, use tool-based matching and propose close matches.
5) Before issue or reservation actions, confirm the matched title if confidence is low.
6) Keep answers concise and operational.
7) When presenting a book, include key metadata when available: title, author, publisher, published year, format/type, and availability.
`;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.93;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;

  return Math.max(0, 1 - distance / maxLen);
}

function isLikelyLibraryQuery(text: string): boolean {
  const normalized = normalizeText(text);
  return DOMAIN_HINTS.some((hint) => normalized.includes(hint));
}

function hasLibraryContext(messages: ChatMessage[]): boolean {
  return messages.some((message) => message.role === "user" && isLikelyLibraryQuery(message.content));
}

function toModelMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages
    .slice(-MAX_HISTORY)
    .map((message) => {
      if (message.role === "assistant") {
        return new AIMessage(message.content);
      }
      return new HumanMessage(message.content);
    });
}

function formatBookLine(book: BookRow): string {
  const author = book.author ?? "Unknown author";
  const publisher = book.publisher ?? "Unknown publisher";
  const year = book.published_year ?? "N/A";
  const type = book.type ?? "unknown";
  const available = book.available_copies ?? 0;
  const total = book.total_copies ?? 0;
  return `${book.title} | ${author} | ${publisher} | ${year} | ${type} | ${available}/${total}`;
}

async function fetchCandidateBooks(query: string): Promise<BookRow[]> {
  const safeQuery = query.trim();
  const like = `%${safeQuery}%`;

  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,title,author,description,publisher,published_year,isbn,type,available_copies,total_copies")
    .or(`title.ilike.${like},author.ilike.${like},description.ilike.${like},isbn.ilike.${like}`)
    .limit(80);

  if (error || !data) {
    return [];
  }

  return data as BookRow[];
}

async function fetchFallbackBooks(): Promise<BookRow[]> {
  const { data } = await supabaseAdmin
    .from("books")
    .select("id,title,author,description,publisher,published_year,isbn,type,available_copies,total_copies")
    .order("id", { ascending: false })
    .limit(200);

  return (data ?? []) as BookRow[];
}

async function rankBooks(query: string): Promise<Array<{ book: BookRow; score: number }>> {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const candidates = await fetchCandidateBooks(query);
  const pool = candidates.length > 0 ? candidates : await fetchFallbackBooks();

  return pool
    .map((book) => {
      const titleScore = similarityScore(normalizeText(book.title ?? ""), normalizedQuery);
      const authorScore = similarityScore(normalizeText(book.author ?? ""), normalizedQuery) * 0.75;
      const isbnScore = similarityScore(normalizeText(book.isbn ?? ""), normalizedQuery) * 0.9;
      const score = Math.max(titleScore, authorScore, isbnScore);
      return { book, score };
    })
    .filter((entry) => entry.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

async function resolveBook(query: string): Promise<{ best: BookRow | null; score: number; alternatives: BookRow[] }> {
  const ranked = await rankBooks(query);
  if (!ranked.length) {
    return { best: null, score: 0, alternatives: [] };
  }

  const [first, ...rest] = ranked;
  return {
    best: first.book,
    score: first.score,
    alternatives: rest.map((item) => item.book).slice(0, 4),
  };
}

async function getAvailablePhysicalCount(bookId: number): Promise<number> {
  const { count } = await supabaseAdmin
    .from("book_copies")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("type", "physical")
    .eq("status", "available");

  return Number(count ?? 0);
}

async function getWaitingQueueCount(bookId: number): Promise<number> {
  const { count } = await supabaseAdmin
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("status", "waiting");

  return Number(count ?? 0);
}

async function createQueuedReservation(userId: string, bookId: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: maxQueue } = await supabaseAdmin
      .from("reservations")
      .select("queue_position")
      .eq("book_id", bookId)
      .eq("status", "waiting")
      .order("queue_position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = Number(maxQueue?.queue_position ?? 0) + 1;
    const { data: inserted, error } = await supabaseAdmin
      .from("reservations")
      .insert({
        user_id: userId,
        book_id: bookId,
        status: "waiting",
        queue_position: nextPosition,
      })
      .select("id,queue_position")
      .maybeSingle();

    if (!error && inserted) {
      return inserted;
    }

    const combined = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
    if (error?.code === "23505" || combined.includes("unique_queue_position")) {
      continue;
    }

    return null;
  }

  return null;
}

function createTools(userId: string) {
  const searchBooksTool = tool(
    async ({ query }: { query: string }) => {
      const ranked = await rankBooks(query);
      if (!ranked.length) {
        return "No exact match found in catalog.";
      }

      const lines = ranked.slice(0, 5).map((item) => `${Math.round(item.score * 100)}% :: ${formatBookLine(item.book)}`);
      return `Top matching books:\n${lines.join("\n")}`;
    },
    {
      name: "search_books",
      description:
        "Search books using fuzzy matching across title, author, isbn, and description. Returns similar matches even if user has small spelling errors.",
      schema: z.object({
        query: z.string().min(2),
      }),
    },
  );

  const bookAvailabilityTool = tool(
    async ({ query }: { query: string }) => {
      const resolved = await resolveBook(query);
      if (!resolved.best) {
        return "Book not found. No close catalog matches were found.";
      }

      const best = resolved.best;
      const physicalAvailable = await getAvailablePhysicalCount(best.id);
      const queueCount = await getWaitingQueueCount(best.id);

      const maybeSuggestions = resolved.alternatives.length
        ? `\nSimilar books: ${resolved.alternatives.map((book) => book.title).join(", ")}`
        : "";

      if (resolved.score < 0.7) {
        return `Book not found exactly for "${query}". Closest match: ${formatBookLine(best)}${maybeSuggestions}`;
      }

      if (best.type === "digital") {
        return `Available as digital access: ${formatBookLine(best)}.`;
      }

      return `Availability: ${formatBookLine(best)} | Physical copies available now: ${physicalAvailable} | Waiting queue: ${queueCount}${maybeSuggestions}`;
    },
    {
      name: "check_book_availability",
      description: "Check if a book is available now and include queue and metadata details.",
      schema: z.object({
        query: z.string().min(2),
      }),
    },
  );

  const issueBookTool = tool(
    async ({ query }: { query: string }) => {
      const resolved = await resolveBook(query);
      if (!resolved.best) {
        return "Issue failed: book not found in catalog.";
      }

      const book = resolved.best;
      if (resolved.score < 0.72) {
        return `I found close match "${book.title}" but confidence is low. Ask again with exact title to issue this book.`;
      }

      if (book.type === "digital") {
        return `This is a digital title. No physical issue needed for ${book.title}.`;
      }

      const { data: activeTransactions } = await supabaseAdmin
        .from("transactions")
        .select("id,status,due_date")
        .eq("user_id", userId)
        .is("return_date", null);

      const hasOverdue = (activeTransactions ?? []).some((tx) => {
        const dueDateValue = tx.due_date ? new Date(tx.due_date).getTime() : Number.POSITIVE_INFINITY;
        return tx.status === "overdue" || dueDateValue < Date.now();
      });

      if (hasOverdue) {
        return "Issue blocked: you have overdue books. Return them before issuing new books.";
      }

      const maxBooksPerUser = await getMaxBooksPerUser();
      if ((activeTransactions?.length ?? 0) >= maxBooksPerUser) {
        return `Issue blocked: you have reached your limit of ${maxBooksPerUser} active books.`;
      }

      const { data: duplicateIssue } = await supabaseAdmin
        .from("transactions")
        .select("id,book_copies!inner(book_id)")
        .eq("user_id", userId)
        .is("return_date", null)
        .eq("book_copies.book_id", book.id)
        .limit(1);

      if ((duplicateIssue ?? []).length > 0) {
        return `Issue blocked: you already hold an active copy of ${book.title}.`;
      }

      const availableCopyIds = await getPhysicalAvailableCopyIds(book.id);
      const ownApprovedReservation = await getApprovedReservationForUser(book.id, userId);
      const reservedForAnotherUser = ownApprovedReservation
        ? false
        : await hasApprovedReservationForAnotherUser(book.id, userId);

      if (reservedForAnotherUser) {
        return `Issue blocked: ${book.title} is currently on hold for another member's approved reservation.`;
      }

      if (availableCopyIds.length === 0) {
        return `Issue failed: no physical copy is available now for ${book.title}. You can add a reservation.`;
      }

      const now = new Date();
      const issueDays = await getIssueDurationDays();
      const dueDate = new Date(now.getTime() + issueDays * 24 * 60 * 60 * 1000).toISOString();

      let inserted:
        | {
            id: number;
            book_copy_id: number;
          }
        | null = null;

      for (const copyId of availableCopyIds) {
        const { data, error } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: userId,
            book_copy_id: copyId,
            issue_date: now.toISOString(),
            due_date: dueDate,
            status: "issued",
          })
          .select("id,book_copy_id")
          .maybeSingle();

        if (!error && data) {
          inserted = data;
          break;
        }
      }

      if (!inserted) {
        return `Issue failed for ${book.title}. Another user may have taken the last copy. Try reservation.`;
      }

      const dueText = new Date(dueDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      await notifyUserById(userId, {
        inAppMessage: `${book.title} issued successfully. Due on ${dueText}.`,
        subject: "IntelliLib: Book Issued via Assistant",
        text: `Your book \"${book.title}\" has been issued. Due date: ${dueText}.`,
        html: `<p>Your book <strong>${book.title}</strong> has been issued.</p><p><strong>Due date:</strong> ${dueText}</p>`,
      });

      const { data: reservation } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("user_id", userId)
        .eq("book_id", book.id)
        .in("status", ["waiting", "approved"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (reservation?.id) {
        await supabaseAdmin
          .from("reservations")
          .update({ status: "completed", queue_position: null })
          .eq("id", reservation.id);
        await compactQueuePositions(book.id);
      }

      return `Issued successfully: ${book.title}. Transaction ID: ${inserted.id}. Due: ${dueText}.`;
    },
    {
      name: "issue_book",
      description: "Issue a physical book for the current signed-in user based on title or hint.",
      schema: z.object({
        query: z.string().min(2),
      }),
    },
  );

  const reserveBookTool = tool(
    async ({ query }: { query: string }) => {
      const resolved = await resolveBook(query);
      if (!resolved.best) {
        return "Reservation failed: book not found.";
      }

      const book = resolved.best;
      if (resolved.score < 0.72) {
        return `I found close match "${book.title}" but confidence is low. Ask again with exact title to reserve this book.`;
      }

      if (book.type === "digital") {
        return `Reservation not required for digital book ${book.title}.`;
      }

      const activeCopies = await getPhysicalAvailableCopyIds(book.id);
      if (activeCopies.length > 0) {
        return `Reservation not created: ${book.title} is currently available to issue now.`;
      }

      const { data: existing } = await supabaseAdmin
        .from("reservations")
        .select("id,status")
        .eq("user_id", userId)
        .eq("book_id", book.id)
        .in("status", ["waiting", "approved"])
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        return `Reservation already exists for ${book.title} with status ${existing.status}.`;
      }

      const { data: activeHold } = await supabaseAdmin
        .from("transactions")
        .select("id,book_copies!inner(book_id)")
        .eq("user_id", userId)
        .is("return_date", null)
        .eq("book_copies.book_id", book.id)
        .limit(1);

      if ((activeHold ?? []).length > 0) {
        return `Reservation blocked: you already hold an active copy of ${book.title}.`;
      }

      const inserted = await createQueuedReservation(userId, book.id);
      if (!inserted) {
        return `Reservation failed for ${book.title}. Please try again.`;
      }

      await notifyUserById(userId, {
        inAppMessage: `${book.title} added to reservation queue at position #${inserted.queue_position}.`,
        subject: "IntelliLib: Reservation Created via Assistant",
        text: `You are in queue for ${book.title} at position #${inserted.queue_position}.`,
        html: `<p>You are in queue for <strong>${book.title}</strong> at position <strong>#${inserted.queue_position}</strong>.</p>`,
      });

      return `Reservation created for ${book.title}. Queue position: #${inserted.queue_position}.`;
    },
    {
      name: "reserve_book",
      description: "Add the current user to reservation queue for a physical book when unavailable.",
      schema: z.object({
        query: z.string().min(2),
      }),
    },
  );

  const myLoansTool = tool(
    async () => {
      const { data, error } = await supabaseAdmin
        .from("transactions")
        .select("id,status,due_date,issue_date,book_copies!inner(books!inner(title,author,publisher,published_year))")
        .eq("user_id", userId)
        .is("return_date", null)
        .order("issue_date", { ascending: false })
        .limit(8);

      if (error) {
        return "Could not load current loans.";
      }

      if (!data || data.length === 0) {
        return "You currently have no active loans.";
      }

      const lines = data.map((tx) => {
        const copyInfo = tx.book_copies as { books?: { title?: string; author?: string; publisher?: string; published_year?: number } } | null;
        const book = copyInfo?.books;
        return `${book?.title ?? "Unknown"} | ${book?.author ?? "Unknown"} | due ${tx.due_date ?? "N/A"} | status ${tx.status}`;
      });

      return `Active loans:\n${lines.join("\n")}`;
    },
    {
      name: "get_my_loans",
      description: "Fetch currently active loans for the signed-in user.",
      schema: z.object({}),
    },
  );

  return [searchBooksTool, bookAvailabilityTool, issueBookTool, reserveBookTool, myLoansTool];
}

function extractAssistantText(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "I could not generate a response right now.";
  }

  const maybeMessages = (result as { messages?: unknown[] }).messages;
  if (!Array.isArray(maybeMessages) || maybeMessages.length === 0) {
    return "I could not generate a response right now.";
  }

  const reversed = [...maybeMessages].reverse();
  for (const message of reversed) {
    if (!message || typeof message !== "object") continue;

    const type = (message as { _getType?: () => string })._getType?.();
    if (type === "ai") {
      const content = (message as { content?: unknown }).content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const text = content
          .map((part) => {
            if (typeof part === "string") return part;
            if (part && typeof part === "object" && "text" in part) {
              const value = (part as { text?: unknown }).text;
              return typeof value === "string" ? value : "";
            }
            return "";
          })
          .join(" ")
          .trim();

        if (text) return text;
      }
    }
  }

  return "I could not generate a response right now.";
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: GENERIC_ASSISTANT_ERROR_MESSAGE }, { status: 500 });
  }

  const body: AssistantBody = await req.json().catch(() => ({}));
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((msg): msg is ChatMessage => Boolean(msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string"))
    .slice(-MAX_HISTORY);

  const latestUserMessage = [...messages].reverse().find((msg) => msg.role === "user")?.content?.trim() ?? "";

  if (!latestUserMessage) {
    return NextResponse.json({ ok: true, reply: "Please ask a library-related question." });
  }

  if (!isLikelyLibraryQuery(latestUserMessage) && !hasLibraryContext(messages.slice(0, -1))) {
    return NextResponse.json({ ok: true, reply: REFUSAL_MESSAGE });
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.1,
  });

  const tools = createTools(user.id);
  const agent = createReactAgent({
    llm: model,
    tools,
    prompt: SYSTEM_PROMPT,
  });

  try {
    const result = await agent.invoke({ messages: toModelMessages(messages) });
    const reply = extractAssistantText(result);

    await supabaseAdmin.from("ai_queries").insert({
      user_id: user.id,
      query: latestUserMessage,
      response: reply,
      context: {
        source: "dashboard-assistant",
        messageCount: messages.length,
      },
    }).throwOnError().catch(() => undefined);

    return NextResponse.json({ ok: true, reply });
  } catch {
    return NextResponse.json({ ok: true, reply: GENERIC_ASSISTANT_ERROR_MESSAGE });
  }
}
