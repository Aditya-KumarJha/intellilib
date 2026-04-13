import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const TARGET_USER_EMAIL =
  process.env.SEED_TARGET_USER_EMAIL || "aditya.kumarjha.it27@heritageit.edu.in";

const MIN_BOOK_COUNT = Number(process.env.SEED_MIN_BOOKS || 80);
const TARGET_USER_TX_COUNT = Math.max(15, Math.min(20, Number(process.env.SEED_USER_BOOKS || 18)));

const CATEGORY_POOL = [
  "Programming",
  "AI",
  "System Design",
  "Cloud",
  "Data Science",
  "DevOps",
  "Security",
  "Databases",
  "Productivity",
  "Machine Learning",
];

function assertNoError(error, label) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysAfter(dateIso, days) {
  const base = new Date(dateIso).getTime();
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    assertNoError(error, "listUsers");

    const chunk = data?.users || [];
    users.push(...chunk);

    if (chunk.length < 200) break;
    page += 1;
  }

  return users;
}

async function resolveTargetUserIdByEmail(email) {
  const allUsers = await listAllAuthUsers();
  const match = allUsers.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());

  if (!match) {
    throw new Error(
      `Target user not found for email ${email}. Set SEED_TARGET_USER_EMAIL to an existing auth user.`
    );
  }

  return match.id;
}

async function ensureCategories() {
  const { data: existing, error: existingErr } = await supabase
    .from("categories")
    .select("id,name")
    .in("name", CATEGORY_POOL);
  assertNoError(existingErr, "select categories");

  const existingByName = new Map((existing || []).map((c) => [c.name, c.id]));
  const missing = CATEGORY_POOL.filter((name) => !existingByName.has(name));

  if (missing.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from("categories")
      .insert(missing.map((name) => ({ name })))
      .select("id,name");
    assertNoError(insertErr, "insert categories");

    for (const row of inserted || []) {
      existingByName.set(row.name, row.id);
    }
  }

  return existingByName;
}

function generateBooks(count, categoryByName) {
  const themes = [
    { prefix: "Practical", subject: "TypeScript Engineering", category: "Programming" },
    { prefix: "Modern", subject: "AI Workflows", category: "AI" },
    { prefix: "Scalable", subject: "Distributed Systems", category: "System Design" },
    { prefix: "Cloud-Native", subject: "Platform Architecture", category: "Cloud" },
    { prefix: "Hands-On", subject: "Data Pipelines", category: "Data Science" },
    { prefix: "Reliable", subject: "CI/CD Automation", category: "DevOps" },
    { prefix: "Applied", subject: "Security Fundamentals", category: "Security" },
    { prefix: "Production", subject: "Database Performance", category: "Databases" },
    { prefix: "Focused", subject: "Developer Productivity", category: "Productivity" },
    { prefix: "Practical", subject: "Machine Learning Ops", category: "Machine Learning" },
  ];

  const publishers = [
    "O'Reilly Media",
    "Manning",
    "Packt",
    "Apress",
    "Pragmatic Bookshelf",
    "No Starch Press",
  ];

  const types = ["physical", "digital", "both"];
  const books = [];

  for (let i = 0; i < count; i += 1) {
    const theme = themes[i % themes.length];
    const edition = Math.floor(i / themes.length) + 1;
    const isbn = `9787${String(100000000 + i).padStart(9, "0")}`;
    const type = types[i % types.length];
    const year = 2012 + (i % 13);

    books.push({
      isbn,
      title: `${theme.prefix} ${theme.subject} Vol ${edition}`,
      author: `Author ${(i % 17) + 1}`,
      description: `${theme.subject} reference focused on practical library and product use-cases.`,
      type,
      category_id: categoryByName.get(theme.category) || null,
      cover_url: `https://picsum.photos/seed/intellilib-book-${i + 1}/600/900`,
      pdf_url:
        type === "digital" || type === "both"
          ? `https://example.com/previews/intellilib-book-${i + 1}.pdf`
          : null,
      publisher: publishers[i % publishers.length],
      published_year: year,
    });
  }

  return books;
}

async function getBookCount() {
  const { count, error } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true });
  assertNoError(error, "count books");
  return count || 0;
}

async function insertBooksIfNeeded() {
  const categoryByName = await ensureCategories();
  const existingCount = await getBookCount();

  if (existingCount >= MIN_BOOK_COUNT) {
    return 0;
  }

  const toCreate = MIN_BOOK_COUNT - existingCount;
  const payload = generateBooks(toCreate, categoryByName);

  const { error } = await supabase
    .from("books")
    .upsert(payload, { onConflict: "isbn", ignoreDuplicates: false });
  assertNoError(error, "upsert books");

  
  return toCreate;
}

async function fetchCandidateBooks(limit = 140) {
  const { data, error } = await supabase
    .from("books")
    .select("id,title,author,type")
    .order("id", { ascending: false })
    .limit(limit);
  assertNoError(error, "fetch candidate books");
  return data || [];
}

async function getActiveBookIdsForUser(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("book_copies(book_id),return_date")
    .eq("user_id", userId)
    .is("return_date", null);
  assertNoError(error, "fetch active user books");

  const set = new Set();

  for (const row of data || []) {
    const copy = Array.isArray(row.book_copies) ? row.book_copies[0] : row.book_copies;
    if (copy?.book_id) {
      set.add(copy.book_id);
    }
  }

  return set;
}

function buildPhysicalLocation(index) {
  const rack = Math.floor(index / 10) + 1;
  const slot = (index % 10) + 1;
  return `R${rack}-S${slot}`;
}

async function ensureBookCopy(book, index) {
  const { data: existing, error: existingErr } = await supabase
    .from("book_copies")
    .select("id,book_id,type,status,location,access_url")
    .eq("book_id", book.id)
    .limit(1);
  assertNoError(existingErr, `select copy for book ${book.id}`);

  if (existing && existing.length > 0) {
    return existing[0];
  }

  let copyType = "physical";
  if (book.type === "digital") copyType = "digital";
  if (book.type === "both") copyType = index % 2 === 0 ? "physical" : "digital";

  const insertRow = {
    book_id: book.id,
    type: copyType,
    status: "available",
    location: copyType === "physical" ? buildPhysicalLocation(index) : null,
    access_url: copyType === "digital" ? `https://example.com/library/access/book-${book.id}` : null,
    condition: "good",
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("book_copies")
    .insert(insertRow)
    .select("id,book_id,type,status,location,access_url")
    .single();
  assertNoError(insertErr, `insert copy for book ${book.id}`);

  return inserted;
}

async function hasOpenTransactionForCopy(copyId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id")
    .eq("book_copy_id", copyId)
    .is("return_date", null)
    .limit(1);
  assertNoError(error, `check open tx copy ${copyId}`);
  return (data || []).length > 0;
}

async function settleExistingOpenOverdues(userId) {
  const { data, error } = await supabase
    .from("transactions")
    .select("id,book_copy_id,issue_date,due_date")
    .eq("user_id", userId)
    .eq("status", "overdue")
    .is("return_date", null);
  assertNoError(error, "select open overdue transactions");

  const overdueRows = data || [];
  if (overdueRows.length === 0) {
    return 0;
  }

  const copyIds = overdueRows.map((row) => row.book_copy_id);

  for (const row of overdueRows) {
    const issueDate = row.issue_date || new Date().toISOString();
    const issueTime = new Date(issueDate).getTime();
    const dueTime = row.due_date ? new Date(row.due_date).getTime() : Number.NaN;

    const normalizedDueDate = Number.isNaN(dueTime) || dueTime < issueTime ? issueDate : row.due_date;
    const nowIso = new Date().toISOString();
    const returnDate = new Date(nowIso).getTime() < new Date(normalizedDueDate).getTime()
      ? normalizedDueDate
      : nowIso;

    const { error: txUpdateErr } = await supabase
      .from("transactions")
      .update({
        status: "returned",
        due_date: normalizedDueDate,
        return_date: returnDate,
      })
      .eq("id", row.id);
    assertNoError(txUpdateErr, `settle overdue transaction ${row.id}`);
  }

  const { error: copyUpdateErr } = await supabase
    .from("book_copies")
    .update({ status: "available" })
    .in("id", copyIds);
  assertNoError(copyUpdateErr, "release settled overdue copies");

  return overdueRows.length;
}

function buildTxPlan(totalCount) {
  const overdueCount = 2;
  const issuedCount = Math.min(6, Math.max(4, totalCount - overdueCount - 8));
  const returnedCount = totalCount - overdueCount - issuedCount;

  const plan = [];

  for (let i = 0; i < returnedCount; i += 1) plan.push("returned");
  for (let i = 0; i < issuedCount; i += 1) plan.push("issued");
  for (let i = 0; i < overdueCount; i += 1) plan.push("overdue");

  return plan;
}

async function createTransactionAndUpdateCopy({ userId, copy, status, index }) {
  const issueDate = daysFromNow(-(20 + index));
  const tx = {
    user_id: userId,
    book_copy_id: copy.id,
    issue_date: issueDate,
    due_date: null,
    return_date: null,
    status,
    fine_amount: 0,
  };

  if (status === "returned") {
    tx.due_date = daysAfter(issueDate, 14);
    tx.return_date = daysAfter(issueDate, 9 + (index % 3));
    tx.status = "returned";
  } else if (status === "issued") {
    tx.due_date = daysFromNow(3 + (index % 8));
    tx.return_date = null;
    tx.status = "issued";
  } else {
    tx.due_date = daysFromNow(-(2 + index));
    tx.return_date = null;
    tx.status = "overdue";
    tx.fine_amount = 20 + index * 5;
  }

  const { error: txErr } = await supabase.from("transactions").insert(tx);
  assertNoError(txErr, `insert ${status} transaction for copy ${copy.id}`);

  const nextCopyStatus = status === "returned" ? "available" : "issued";
  const { error: copyErr } = await supabase
    .from("book_copies")
    .update({ status: nextCopyStatus })
    .eq("id", copy.id);
  assertNoError(copyErr, `update copy status ${copy.id}`);
}

async function seedUserTransactions(userId) {
  const settledCount = await settleExistingOpenOverdues(userId);
  if (settledCount > 0) {
  }

  const candidates = await fetchCandidateBooks(180);
  const activeBookIds = await getActiveBookIdsForUser(userId);
  const txPlan = buildTxPlan(TARGET_USER_TX_COUNT);

  let created = 0;
  let cursor = 0;

  while (created < txPlan.length && cursor < candidates.length) {
    const book = candidates[cursor];
    cursor += 1;

    const status = txPlan[created];

    // Keep active-like transactions on unique books per user rule.
    if ((status === "issued" || status === "overdue") && activeBookIds.has(book.id)) {
      continue;
    }

    const copy = await ensureBookCopy(book, created);

    // Respect unique open issue per copy.
    const openExists = await hasOpenTransactionForCopy(copy.id);
    if (openExists) {
      continue;
    }

    await createTransactionAndUpdateCopy({ userId, copy, status, index: created });

    if (status === "issued" || status === "overdue") {
      activeBookIds.add(book.id);
    }

    created += 1;
  }

  if (created < 15) {
    throw new Error(
      `Only created ${created} user transactions. Not enough eligible copies/books for requested range.`
    );
  }

  
}

async function main() {
  

  await insertBooksIfNeeded();

  const userId = await resolveTargetUserIdByEmail(TARGET_USER_EMAIL);
  await seedUserTransactions(userId);

  const finalCount = await getBookCount();
  
}

main().catch((error) => {
  console.error("Bulk seed failed:", error.message);
  process.exit(1);
});
