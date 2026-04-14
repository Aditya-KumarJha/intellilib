import { NextResponse } from "next/server";
import { HumanMessage, AIMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { notifyUserById, insertNotificationRows } from "@/lib/server/libraryNotifications";
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

type StaffProfile = {
  id: string;
};

type ActiveLoanRow = {
  id: number;
  due_date: string | null;
  book_copies: {
    books: {
      title: string | null;
      author: string | null;
    } | null;
  } | null;
};

const MAX_HISTORY = 16;

const REFUSAL_MESSAGE =
  "I am IntelliLib's library assistant. I can only help with library operations like searching books, checking availability, issue/return/reservations, fines, and your library account activity.";

const GENERIC_ASSISTANT_ERROR_MESSAGE =
  "I could not complete that request right now. Please try again in a moment.";

const AGENT_RECURSION_LIMIT = 12;

const DOMAIN_HINTS = [
  "book",
  "books",
  "library",
  "librarian",
  "catalogue",
  "issue",
  "issued",
  "return",
  "renew",
  "renewal",
  "reserve",
  "reservation",
  "hold",
  "on hold",
  "queue",
  "pickup",
  "shelf",
  "location",
  "author",
  "title",
  "genre",
  "category",
  "recommend",
  "suggest",
  "similar",
  "related books",
  "new arrivals",
  "trending",
  "publisher",
  "isbn",
  "copy",
  "copies",
  "physical",
  "digital",
  "ebook",
  "available",
  "availability",
  "stock",
  "loan",
  "loans",
  "borrowed",
  "fine",
  "fines",
  "penalty",
  "payment",
  "pay",
  "paid",
  "unpaid",
  "due date",
  "catalog",
  "intellilib",
  "my books",
  "smart search",
  "borrow",
  "due",
  "overdue",
  "history",
];

const GREETING_HINTS = [
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
  "what are you doing",
  "sup",
  "yo",
];

const CATALOG_OVERVIEW_HINTS = [
  "what books",
  "books we have",
  "books in library",
  "books do you have",
  "which books are there",
  "show me books",
  "library catalog",
  "catalog",
  "catalogue",
  "list books",
  "show books",
  "available books",
  "new books",
  "top books",
  "trending books",
  "books by",
  "recommend books",
  "suggest books",
];

const LOANS_OVERVIEW_HINTS = [
  "what book i have issued",
  "what books i have issued",
  "what did i issue",
  "which book did i issue",
  "which books i issued",
  "which books have i issued",
  "my issued books",
  "my active loans",
  "show my loans",
  "show my issued books",
  "my borrowed books",
  "what books i borrowed",
  "books i borrowed",
  "books due",
  "books due this week",
];

const SYSTEM_PROMPT = `You are IntelliLib Assistant, a strict domain assistant for the IntelliLib platform.

Rules:
1) You are allowed to help only with IntelliLib domain tasks: books, catalog metadata, availability, issue/return/reservations, queue status, fines/payments, user loans, and dashboard-related library actions.
2) If user asks anything outside IntelliLib domain (coding exercises, geography, politics, math unrelated to library usage, general trivia), politely refuse with this exact sentence:
${REFUSAL_MESSAGE}
3) Use tools whenever facts are needed. Never invent database records.
4) For spelling mistakes in book names, use tool-based matching and propose close matches.
5) Before issue or reservation actions, confirm the matched title if confidence is low.
6) For return requests, use the return_book tool and request librarian processing; support single title and all-active-loans requests.
7) Keep answers concise and operational.
8) When presenting a book, include key metadata when available: title, author, publisher, published year, format/type, and availability.
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

function isGreetingOnlyMessage(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (isLikelyLibraryQuery(normalized)) return false;

  const wordCount = normalized.split(" ").filter(Boolean).length;
  if (wordCount > 8) return false;

  return GREETING_HINTS.some((hint) => normalized.includes(hint));
}

function buildGreetingReply(): string {
  return "Hello, I am fine. How can I help you with IntelliLib today?";
}

function isCatalogOverviewQuery(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const hasCatalogHint = CATALOG_OVERVIEW_HINTS.some((hint) => normalized.includes(hint));
  if (!hasCatalogHint) return false;

  const hasActionIntent = ["issue", "reserve", "return", "loan", "my books", "queue"].some((hint) =>
    normalized.includes(hint),
  );

  return !hasActionIntent;
}

function isAvailabilityQuery(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  const availabilityHints = [
    "do we have",
    "is available",
    "availability",
    "in stock",
    "have book",
    "can i get",
    "can i borrow",
    "is this book there",
    "is this title available",
    "how many copies",
    "available now",
    "available today",
  ];

  return availabilityHints.some((hint) => normalized.includes(hint));
}

async function buildCatalogOverviewReply(limit = 10): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("title,author,publisher,published_year,type,available_copies,total_copies")
    .order("title", { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return "I could not load the catalog right now. Please try again in a moment.";
  }

  const lines = data.map((book) => {
    const title = book.title ?? "Unknown title";
    const author = book.author ?? "Unknown author";
    const type = book.type ?? "unknown";
    const available = Number(book.available_copies ?? 0);
    const total = Number(book.total_copies ?? 0);
    return `- ${title} by ${author} (${type}) | ${available}/${total} available`;
  });

  return `Here are some books from our catalog:\n${lines.join("\n")}\n\nYou can ask me to check availability, issue, reserve, or return any title.`;
}

function isLoansOverviewQuery(text: string): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return LOANS_OVERVIEW_HINTS.some((hint) => normalized.includes(hint));
}

async function buildMyLoansOverviewReply(userId: string, limit = 8): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("transactions")
    .select("id,status,due_date,issue_date,book_copies!inner(books!inner(title,author,publisher,published_year))")
    .eq("user_id", userId)
    .is("return_date", null)
    .order("issue_date", { ascending: false })
    .limit(limit);

  if (error) {
    return "Could not load current loans.";
  }

  if (!data || data.length === 0) {
    return "You currently have no active loans.";
  }

  const lines = data.map((tx) => {
    const copyInfo = tx.book_copies as { books?: { title?: string; author?: string } } | null;
    const book = copyInfo?.books;
    return `- ${book?.title ?? "Unknown"} | ${book?.author ?? "Unknown"} | due ${tx.due_date ?? "N/A"} | status ${tx.status}`;
  });

  return `Active loans:\n${lines.join("\n")}`;
}

async function buildAvailabilityFallbackReply(query: string): Promise<string> {
  const resolved = await resolveBook(query);
  if (!resolved.best) {
    return "Book not found. No close catalog matches were found.";
  }

  const best = resolved.best;
  const maybeSuggestions = resolved.alternatives.length
    ? `\nSimilar books: ${resolved.alternatives.map((book) => book.title).join(", ")}`
    : "";

  if (resolved.score < 0.7) {
    return `Book not found exactly for "${query}". Closest match: ${formatBookLine(best)}${maybeSuggestions}`;
  }

  if (best.type === "digital") {
    return `Available as digital access: ${formatBookLine(best)}.`;
  }

  const physicalAvailable = await getAvailablePhysicalCount(best.id);
  const queueCount = await getWaitingQueueCount(best.id);
  return `Availability: ${formatBookLine(best)} | Physical copies available now: ${physicalAvailable} | Waiting queue: ${queueCount}${maybeSuggestions}`;
}

function isGroqToolUseFailedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = (error as { error?: { error?: { code?: unknown } } }).error?.error;
  return maybeError?.code === "tool_use_failed";
}

function extractFailedGeneration(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const maybeError = (error as { error?: { error?: { failed_generation?: unknown } } }).error?.error;
  const failed = maybeError?.failed_generation;
  return typeof failed === "string" ? failed : null;
}

function parseFailedFunctionCall(
  failedGeneration: string,
): { name: string; args: Record<string, unknown> } | null {
  const sanitized = failedGeneration.replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  const match = sanitized.match(/<function=([a-z_][a-z0-9_]*)(\{[\s\S]*?\})?\s*\/?>(?:<\/function>)?/i);
  if (!match) return null;

  const name = String(match[1]);
  const rawArgs = match[2];
  if (!rawArgs) {
    return { name, args: {} };
  }

  try {
    const parsed = JSON.parse(rawArgs) as Record<string, unknown>;
    return { name, args: parsed };
  } catch {
    return { name, args: {} };
  }
}

async function buildSearchFallbackReply(query: string): Promise<string> {
  const ranked = await rankBooks(query);
  if (!ranked.length) {
    return "No exact match found in catalog.";
  }

  const lines = ranked.slice(0, 5).map((item) => `${Math.round(item.score * 100)}% :: ${formatBookLine(item.book)}`);
  return `Top matching books:\n${lines.join("\n")}`;
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

async function createReturnRequest(
  userId: string,
  emailOrId: string,
  transactionId: number,
  bookTitle: string,
): Promise<"created" | "already_pending"> {
  const { data: existingPending } = await supabaseAdmin
    .from("return_requests")
    .select("id")
    .eq("transaction_id", transactionId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending?.id) {
    return "already_pending";
  }

  const { error: requestError } = await supabaseAdmin
    .from("return_requests")
    .insert({
      transaction_id: transactionId,
      user_id: userId,
      status: "pending",
    });

  if (requestError?.code === "23505") {
    return "already_pending";
  }

  if (requestError) {
    throw new Error(requestError.message ?? "Could not create return request.");
  }

  const message = `${emailOrId} requested to return ${bookTitle} (tx:${transactionId}).`;

  const { data: staff } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .in("role", ["librarian", "admin"]);

  if (Array.isArray(staff) && staff.length > 0) {
    const inserts = (staff as StaffProfile[]).map((staffUser) => ({
      user_id: staffUser.id,
      type: "return_request",
      message,
      is_read: false,
      target_role: "librarian",
      metadata: {
        requested_by: userId,
        requested_email: emailOrId,
        transactionId: transactionId,
        bookTitle,
      },
    }));
    await insertNotificationRows(inserts);
  }

  await notifyUserById(userId, {
    inAppMessage: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
    subject: "IntelliLib: Return Requested",
    text: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
    html: `<p>Return requested for <strong>${bookTitle}</strong>. A librarian will process it shortly.</p>`,
  });

  return "created";
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
        return `- ${book?.title ?? "Unknown"} | ${book?.author ?? "Unknown"} | due ${tx.due_date ?? "N/A"} | status ${tx.status}`;
      });

      return `Active loans:\n${lines.join("\n")}`;
    },
    {
      name: "get_my_loans",
      description: "Fetch currently active loans for the signed-in user.",
      schema: z.object({}),
    },
  );

  const returnBookTool = tool(
    async ({ query }: { query: string }) => {
      const { data, error } = await supabaseAdmin
        .from("transactions")
        .select("id,due_date,book_copies!inner(books!inner(title,author))")
        .eq("user_id", userId)
        .is("return_date", null)
        .order("issue_date", { ascending: true })
        .limit(12);

      if (error) {
        return "Could not load your active loans for return request.";
      }

      const activeLoans = (data ?? []) as unknown as ActiveLoanRow[];
      if (activeLoans.length === 0) {
        return "You do not have any active loans to return.";
      }

      const normalizedQuery = normalizeText(query);
      const returnAllRequested = ["all", "both", "all books", "all loans", "everything"].some((hint) =>
        normalizedQuery.includes(hint),
      );

      const emailOrId = userId;

      if (returnAllRequested) {
        let createdCount = 0;
        let alreadyPendingCount = 0;

        for (const loan of activeLoans) {
          const title = loan.book_copies?.books?.title ?? "your book";
          const status = await createReturnRequest(userId, emailOrId, loan.id, title);
          if (status === "created") createdCount += 1;
          if (status === "already_pending") alreadyPendingCount += 1;
        }

        if (createdCount === 0 && alreadyPendingCount > 0) {
          return "Return request already in process for your active loans. A librarian will process them shortly.";
        }

        if (alreadyPendingCount > 0) {
          return `Return requested for ${createdCount} active loan(s). ${alreadyPendingCount} already in process.`;
        }

        return `Return requested for ${activeLoans.length} active loan(s). A librarian will process them shortly.`;
      }

      const ranked = activeLoans
        .map((loan) => {
          const title = normalizeText(loan.book_copies?.books?.title ?? "");
          const author = normalizeText(loan.book_copies?.books?.author ?? "");
          const score = Math.max(similarityScore(title, normalizedQuery), similarityScore(author, normalizedQuery) * 0.75);
          return { loan, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      if (!best || best.score < 0.55) {
        const options = activeLoans
          .map((loan) => loan.book_copies?.books?.title)
          .filter((title): title is string => Boolean(title))
          .slice(0, 6)
          .join(", ");
        return `I could not match that to one of your active loans. Please mention an exact title. Active loans: ${options || "N/A"}.`;
      }

      const title = best.loan.book_copies?.books?.title ?? "your book";
      const returnRequestStatus = await createReturnRequest(userId, emailOrId, best.loan.id, title);

      if (returnRequestStatus === "already_pending") {
        return `Return request already in process for ${title}. A librarian will process it shortly.`;
      }

      return `Return requested for ${title}. A librarian will process it shortly.`;
    },
    {
      name: "return_book",
      description:
        "Create a librarian return request for one active loan by title/author, or for all active loans when user asks for all/both/everything.",
      schema: z.object({
        query: z.string().min(1),
      }),
    },
  );

  return [searchBooksTool, bookAvailabilityTool, issueBookTool, reserveBookTool, myLoansTool, returnBookTool];
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

function isGraphRecursionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeCode = (error as { lc_error_code?: unknown }).lc_error_code;
  if (maybeCode === "GRAPH_RECURSION_LIMIT") return true;

  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === "string" && maybeMessage.includes("Recursion limit");
}

function buildLoopFallbackReply(userInput: string): string {
  const normalized = normalizeText(userInput);

  if (normalized.includes("return")) {
    return "I got stuck while creating the return request. Please rephrase with one clear command, for example: return clean code, or return all my books.";
  }

  return "I got stuck while processing that request. Please rephrase with one clear action, for example: check availability for a title, issue a title, reserve a title, or show my active loans.";
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error: GROQ_API_KEY is missing. Restart dev server after updating env." },
      { status: 500 },
    );
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

  if (isGreetingOnlyMessage(latestUserMessage)) {
    return NextResponse.json({ ok: true, reply: buildGreetingReply() });
  }

  if (isCatalogOverviewQuery(latestUserMessage)) {
    const reply = await buildCatalogOverviewReply();
    return NextResponse.json({ ok: true, reply });
  }

  if (isAvailabilityQuery(latestUserMessage)) {
    const reply = await buildAvailabilityFallbackReply(latestUserMessage);
    return NextResponse.json({ ok: true, reply });
  }

  if (isLoansOverviewQuery(latestUserMessage)) {
    const reply = await buildMyLoansOverviewReply(user.id);
    return NextResponse.json({ ok: true, reply });
  }

  if (!isLikelyLibraryQuery(latestUserMessage) && !hasLibraryContext(messages.slice(0, -1))) {
    return NextResponse.json({ ok: true, reply: REFUSAL_MESSAGE });
  }

  const model = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.1,
  });

  const tools = createTools(user.id);
  const agent = createReactAgent({
    llm: model,
    tools,
    prompt: SYSTEM_PROMPT,
  });

  try {
    const result = await agent.invoke({ messages: toModelMessages(messages) }, { recursionLimit: AGENT_RECURSION_LIMIT });
    const reply = extractAssistantText(result);

    try {
      await supabaseAdmin
        .from("ai_queries")
        .insert({
          user_id: user.id,
          query: latestUserMessage,
          response: reply,
          context: {
            source: "dashboard-assistant",
            messageCount: messages.length,
          },
        })
        .throwOnError();
    } catch {
      // Best-effort analytics logging; ignore insert failures.
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error: unknown) {
    if (isGraphRecursionError(error)) {
      const reply = buildLoopFallbackReply(latestUserMessage);
      return NextResponse.json({ ok: true, reply });
    }

    if (isGroqToolUseFailedError(error)) {
      const failedGeneration = extractFailedGeneration(error);
      const failedCall = failedGeneration ? parseFailedFunctionCall(failedGeneration) : null;

      if (failedCall?.name === "search_books") {
        const query = typeof failedCall.args.query === "string" ? failedCall.args.query : latestUserMessage;
        const reply = await buildSearchFallbackReply(query);
        return NextResponse.json({ ok: true, reply });
      }

      if (failedCall?.name === "check_book_availability") {
        const query = typeof failedCall.args.query === "string" ? failedCall.args.query : latestUserMessage;
        const reply = await buildAvailabilityFallbackReply(query);
        return NextResponse.json({ ok: true, reply });
      }

      if (failedCall?.name === "get_my_loans") {
        const reply = await buildMyLoansOverviewReply(user.id);
        return NextResponse.json({ ok: true, reply });
      }

      if (isCatalogOverviewQuery(latestUserMessage)) {
        const reply = await buildCatalogOverviewReply();
        return NextResponse.json({ ok: true, reply });
      }

      if (isLoansOverviewQuery(latestUserMessage)) {
        const reply = await buildMyLoansOverviewReply(user.id);
        return NextResponse.json({ ok: true, reply });
      }

      if (isAvailabilityQuery(latestUserMessage)) {
        const reply = await buildAvailabilityFallbackReply(latestUserMessage);
        return NextResponse.json({ ok: true, reply });
      }

      if (isLikelyLibraryQuery(latestUserMessage)) {
        const reply = await buildSearchFallbackReply(latestUserMessage);
        return NextResponse.json({ ok: true, reply });
      }
    }

    const message = error instanceof Error ? error.message : "Unknown assistant error.";
    console.error("Assistant route failed:", error);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: `Assistant invocation failed: ${message}` }, { status: 500 });
    }

    return NextResponse.json({ error: GENERIC_ASSISTANT_ERROR_MESSAGE }, { status: 500 });
  }
}
