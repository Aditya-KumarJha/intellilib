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

const USERS_TO_SEED = [
  {
    email: "aj12102003@gmail.com",
    role: "admin",
    full_name: "Aditya Jha",
    avatar_url:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
  },
  {
    email: "mentorxcontact@gmail.com",
    role: "librarian",
    full_name: "Riya Sharma",
    avatar_url:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80",
  },
  {
    email: "adi.kumar.jha.12@gmail.com",
    role: "user",
    full_name: "Arjun Patel",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  {
    email: "aditya.kumarjha.it27@heritageit.edu.in",
    role: "user",
    full_name: "Meera Das",
    avatar_url:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
  },
];

const BOOK_SEED = [
  {
    isbn: "9780132350884",
    title: "Clean Code",
    author: "Robert C. Martin",
    description: "A handbook of agile software craftsmanship.",
    type: "physical",
    category: "Programming",
    cover_url:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
    pdf_url: "https://example.com/previews/clean-code-sample.pdf",
    publisher: "Prentice Hall",
    published_year: 2008,
  },
  {
    isbn: "9781449373320",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    description: "Big ideas for building reliable and scalable systems.",
    type: "physical",
    category: "System Design",
    cover_url:
      "https://images.unsplash.com/photo-1455885666463-1f9f31fc4f8a?auto=format&fit=crop&w=800&q=80",
    pdf_url: "https://example.com/previews/ddia-sample.pdf",
    publisher: "O'Reilly Media",
    published_year: 2017,
  },
  {
    isbn: "9781484250273",
    title: "Artificial Intelligence Basics",
    author: "Tom Taulli",
    description: "A practical intro to AI fundamentals.",
    type: "digital",
    category: "AI",
    cover_url:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80",
    publisher: "Apress",
    published_year: 2019,
    pdf_url: "https://example.com/artificial-intelligence-basics.pdf",
  },
  {
    isbn: "9780135957059",
    title: "The Pragmatic Programmer",
    author: "David Thomas",
    description: "Modern craftsmanship and practical software engineering habits.",
    type: "both",
    category: "Programming",
    cover_url:
      "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
    pdf_url: "https://example.com/previews/pragmatic-programmer-sample.pdf",
    publisher: "Addison-Wesley",
    published_year: 2019,
  },
  {
    isbn: "9781617296864",
    title: "Grokking Algorithms",
    author: "Aditya Bhargava",
    description: "A visual and friendly guide to core algorithms.",
    type: "digital",
    category: "Programming",
    cover_url:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80",
    pdf_url: "https://example.com/previews/grokking-algorithms-sample.pdf",
    publisher: "Manning",
    published_year: 2021,
  },
];

function assertNoError(error, label) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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

async function cleanAllRelationalData() {

  // Child-first delete order based on FKs.
  let error;

  ({ error } = await supabase.from("payments").delete().gte("id", 0));
  assertNoError(error, "delete payments");

  ({ error } = await supabase.from("fines").delete().gte("id", 0));
  assertNoError(error, "delete fines");

  ({ error } = await supabase.from("transactions").delete().gte("id", 0));
  assertNoError(error, "delete transactions");

  ({ error } = await supabase.from("reservations").delete().gte("id", 0));
  assertNoError(error, "delete reservations");

  ({ error } = await supabase.from("notifications").delete().gte("id", 0));
  assertNoError(error, "delete notifications");

  ({ error } = await supabase.from("ai_queries").delete().gte("id", 0));
  assertNoError(error, "delete ai_queries");

  ({ error } = await supabase.from("audit_logs").delete().gte("id", 0));
  assertNoError(error, "delete audit_logs");

  ({ error } = await supabase.from("book_copies").delete().gte("id", 0));
  assertNoError(error, "delete book_copies");

  ({ error } = await supabase.from("books").delete().gte("id", 0));
  assertNoError(error, "delete books");

  ({ error } = await supabase.from("categories").delete().gte("id", 0));
  assertNoError(error, "delete categories");

  ({ error } = await supabase.from("system_settings").delete().gte("id", 0));
  assertNoError(error, "delete system_settings");
}

async function cleanSeededAuthUsers() {
  const allUsers = await listAllAuthUsers();
  const emailSet = new Set(USERS_TO_SEED.map((u) => u.email.toLowerCase()));

  const targets = allUsers.filter((u) => emailSet.has((u.email || "").toLowerCase()));

  for (const u of targets) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    assertNoError(error, `delete auth user ${u.email}`);
  }

  if (targets.length > 0) {
    const ids = targets.map((u) => u.id);
    const { error } = await supabase.from("profiles").delete().in("id", ids);
    assertNoError(error, "delete old profiles");
  }
}

async function createUserWithProfile({ email, role, full_name, avatar_url }) {
  const fullName = full_name || email.split("@")[0];
  const avatarUrl = avatar_url || null;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "password123",
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      avatar_url: avatarUrl,
    },
  });
  assertNoError(error, `create user ${email}`);

  const user = data.user;

  // Trigger should create profile, but this upsert makes seeding deterministic.
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      role,
      avatar_url: avatarUrl,
    },
    { onConflict: "id" }
  );
  assertNoError(profileError, `upsert profile ${email}`);

  return {
    id: user.id,
    email,
    role,
  };
}

async function insertCategories() {
  const categoryRows = [
    { name: "AI" },
    { name: "System Design" },
    { name: "Programming" },
    { name: "Cloud" },
    { name: "Data Science" },
  ];

  const { data, error } = await supabase.from("categories").insert(categoryRows).select("id,name");
  assertNoError(error, "insert categories");

  return Object.fromEntries(data.map((c) => [c.name, c.id]));
}

async function insertBooks(categoryMap) {
  const rows = BOOK_SEED.map((b) => ({
    title: b.title,
    author: b.author,
    description: b.description,
    type: b.type,
    category_id: categoryMap[b.category],
    isbn: b.isbn,
    cover_url: b.cover_url,
    pdf_url: b.pdf_url || null,
    publisher: b.publisher,
    published_year: b.published_year,
  }));

  const { data, error } = await supabase.from("books").insert(rows).select("id,isbn,title");
  assertNoError(error, "insert books");

  return Object.fromEntries(data.map((b) => [b.isbn, b]));
}

async function insertBookCopies(bookMap) {
  const rows = [
    {
      book_id: bookMap["9780132350884"].id,
      type: "physical",
      status: "available",
      location: "A1",
      condition: "good",
    },
    {
      book_id: bookMap["9780132350884"].id,
      type: "physical",
      status: "available",
      location: "A2",
      condition: "good",
    },
    {
      book_id: bookMap["9781449373320"].id,
      type: "physical",
      status: "available",
      location: "B1",
      condition: "good",
    },
    {
      book_id: bookMap["9781449373320"].id,
      type: "physical",
      status: "maintenance",
      location: "B2",
      condition: "worn",
    },
    {
      book_id: bookMap["9781484250273"].id,
      type: "digital",
      status: "available",
      access_url: "https://example.com/ai-basics-digital-copy",
      condition: "new",
    },
    {
      book_id: bookMap["9780135957059"].id,
      type: "physical",
      status: "available",
      location: "C1",
      condition: "excellent",
    },
    {
      book_id: bookMap["9780135957059"].id,
      type: "digital",
      status: "available",
      access_url: "https://example.com/pragmatic-programmer-digital-copy",
      condition: "new",
    },
    {
      book_id: bookMap["9781617296864"].id,
      type: "digital",
      status: "reserved",
      access_url: "https://example.com/grokking-algorithms-digital-copy",
      condition: "new",
    },
  ];

  const { data, error } = await supabase
    .from("book_copies")
    .insert(rows)
    .select("id,book_id,type,location,access_url,status");
  assertNoError(error, "insert book_copies");

  const pick = (bookId, type, locator) =>
    data.find(
      (c) =>
        c.book_id === bookId &&
        c.type === type &&
        ((type === "physical" && c.location === locator) ||
          (type === "digital" && c.access_url === locator))
    );

  return {
    cleanCodeA1: pick(bookMap["9780132350884"].id, "physical", "A1"),
    ddiaB1: pick(bookMap["9781449373320"].id, "physical", "B1"),
    pragmaticC1: pick(bookMap["9780135957059"].id, "physical", "C1"),
  };
}

async function insertTransactions(members, copies) {
  const rows = [
    {
      user_id: members[0].id,
      book_copy_id: copies.cleanCodeA1.id,
      due_date: daysFromNow(5),
      fine_amount: 0,
    },
    {
      user_id: members[1].id,
      book_copy_id: copies.ddiaB1.id,
      due_date: daysFromNow(-3),
      fine_amount: 30,
    },
    {
      user_id: members[0].id,
      book_copy_id: copies.pragmaticC1.id,
      issue_date: daysFromNow(-15),
      due_date: daysFromNow(-8),
      return_date: daysFromNow(-6),
      fine_amount: 0,
    },
  ];

  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select("id,user_id,book_copy_id,status,due_date");
  assertNoError(error, "insert transactions");

  return data;
}

async function insertFinesAndPayments(members, transactions) {
  const overdueTx = transactions.find((t) => t.user_id === members[1].id);
  const returnedTx = transactions.find((t) => t.status === "returned");

  const { data: fineRows, error: fineErr } = await supabase
    .from("fines")
    .insert([
      {
        user_id: members[1].id,
        transaction_id: overdueTx.id,
        amount: 30,
        status: "pending",
      },
      {
        user_id: members[0].id,
        transaction_id: returnedTx.id,
        amount: 10,
        status: "paid",
        paid_at: new Date().toISOString(),
      },
    ])
    .select("id,transaction_id,amount,status,user_id");
  assertNoError(fineErr, "insert fines");

  const pendingFine = fineRows.find((f) => f.status === "pending");
  const paidFine = fineRows.find((f) => f.status === "paid");

  const { error: paymentErr } = await supabase.from("payments").insert([
    {
      user_id: pendingFine.user_id,
      fine_id: pendingFine.id,
      amount: pendingFine.amount,
      provider: "razorpay",
      status: "created",
      method: "upi",
      vpa: "meera@oksbi",
      razorpay_order_id: `order_seed_${pendingFine.id}`,
    },
    {
      user_id: paidFine.user_id,
      fine_id: paidFine.id,
      amount: paidFine.amount,
      provider: "razorpay",
      status: "success",
      method: "card",
      bank: "HDFC",
      razorpay_order_id: `order_seed_${paidFine.id}`,
      razorpay_payment_id: `seed_payment_${paidFine.id}`,
      razorpay_signature: `sig_seed_${paidFine.id}`,
    },
  ]);
  assertNoError(paymentErr, "insert payments");
}

async function insertReservations(members, bookMap, transactions = []) {
  const ddiaId = bookMap["9781449373320"].id;

  // fallback safety
  if (!Array.isArray(transactions)) transactions = [];

  const activeUserIds = new Set(
    transactions
      .filter((t) => !t.return_date)
      .map((t) => t.user_id)
  );

  const safeUsers = members.filter((u) => !activeUserIds.has(u.id));

  if (safeUsers.length === 0) {
    console.log("⚠️ No safe users for reservation, skipping...");
    return;
  }

  const { error } = await supabase.from("reservations").insert([
    {
      user_id: safeUsers[0].id,
      book_id: ddiaId,
      queue_position: 1,
      status: "waiting",
    },
  ]);

  assertNoError(error, "insert reservations");
}

async function insertNotifications(members) {
  const { error } = await supabase.from("notifications").insert([
    {
      user_id: members[0].id,
      type: "due_reminder",
      message: "Your book is due soon",
    },
    {
      user_id: members[1].id,
      type: "fine_alert",
      message: "You have a pending fine of 30",
    },
    {
      user_id: members[0].id,
      type: "payment_success",
      message: "Your payment for overdue fine has been processed successfully.",
      is_read: true,
    },
    {
      user_id: members[1].id,
      type: "reservation_update",
      message: "Your reservation for DDIA is approved. Please collect within 24 hours.",
    },
  ]);
  assertNoError(error, "insert notifications");
}

async function insertAiQueries(members) {
  const { error } = await supabase.from("ai_queries").insert([
    {
      user_id: members[0].id,
      query: "Suggest AI books",
      response: "Try Artificial Intelligence Basics",
      context: {
        intent: "recommendation",
        preferred_category: "AI",
        format: "digital",
      },
    },
    {
      user_id: members[1].id,
      query: "Where is Clean Code?",
      response: "Shelf A1",
      context: {
        intent: "book_location",
        title: "Clean Code",
        copy_location: "A1",
      },
    },
    {
      user_id: members[1].id,
      query: "Show my pending fines",
      response: "You currently have one pending fine of 30.",
      context: {
        intent: "fine_summary",
        pending_count: 1,
        amount_due: 30,
      },
    },
  ]);
  assertNoError(error, "insert ai_queries");
}

async function insertAuditLogs(adminId, librarianId, transactions) {
  const firstTx = transactions[0];
  const overdueTx = transactions.find((t) => t.status === "overdue");

  const { error } = await supabase.from("audit_logs").insert([
    {
      user_id: librarianId,
      action: "BOOK_ISSUED",
      entity: "transactions",
      entity_id: firstTx.id,
      metadata: {
        channel: "dashboard",
        note: "Manual issue from circulation desk",
      },
    },
    {
      user_id: adminId,
      action: "PAYMENT_VERIFIED",
      entity: "payments",
      metadata: {
        provider: "razorpay",
        verification: "auto",
      },
    },
    {
      user_id: librarianId,
      action: "OVERDUE_REVIEWED",
      entity: "transactions",
      entity_id: overdueTx?.id || null,
      metadata: {
        severity: "medium",
        action_taken: "notification_sent",
      },
    },
  ]);
  assertNoError(error, "insert audit_logs");
}

async function insertSystemSettings() {
  const { error } = await supabase.from("system_settings").insert({
    max_books_per_user: 3,
    max_days_allowed: 14,
    fine_per_day: 5,
  });
  assertNoError(error, "insert system_settings");
}

async function seed() {

  await cleanAllRelationalData();
  await cleanSeededAuthUsers();

  const users = [];
  for (const u of USERS_TO_SEED) {
    users.push(await createUserWithProfile(u));
  }

  const admin = users.find((u) => u.role === "admin")?.id;
  const librarian = users.find((u) => u.role === "librarian")?.id;
  const members = users.filter((u) => u.role === "user");

  if (!admin || !librarian || members.length < 2) {
    throw new Error("Expected 1 admin, 1 librarian, and at least 2 users.");
  }

  await insertSystemSettings();

  const categoryMap = await insertCategories();
  const bookMap = await insertBooks(categoryMap);
  const copyMap = await insertBookCopies(bookMap);
  const transactions = await insertTransactions(members, copyMap);

  await insertFinesAndPayments(members, transactions);
  await insertReservations(members, bookMap);
  await insertNotifications(members);
  await insertAiQueries(members);
  await insertAuditLogs(admin, librarian, transactions);

  
}

seed().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
