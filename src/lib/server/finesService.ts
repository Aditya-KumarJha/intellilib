import supabaseAdmin from "@/lib/supabaseServerClient";
import { isDbTimestampPast, dbTimestampToEpochMs } from "@/lib/dateTime";

type TransactionFineCandidate = {
  id: number;
  user_id: string;
  due_date: string | null;
  status: string | null;
};

type FineSettingRow = {
  fine_per_day: number | null;
};

function fallbackFineAmount(dueDateIso: string | null, finePerDay: number): number {
  if (!dueDateIso) return 0;
  const dueMs = dbTimestampToEpochMs(dueDateIso) ?? Number.NaN;
  if (!Number.isFinite(dueMs)) return 0;

  const diffMs = Date.now() - dueMs;
  if (diffMs <= 0) return 0;

  const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.round(daysOverdue * finePerDay));
}

async function getFinePerDaySetting(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("fine_per_day")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = (data ?? null) as FineSettingRow | null;
  const value = Number(row?.fine_per_day ?? 5);
  return Number.isFinite(value) && value > 0 ? value : 5;
}

async function calculateFineAmountForTransaction(
  transactionId: number,
  dueDateIso: string | null,
  finePerDay: number,
): Promise<number> {
  const fallback = fallbackFineAmount(dueDateIso, finePerDay);

  const { data, error } = await supabaseAdmin.rpc("calculate_fine", {
    p_transaction_id: transactionId,
  });

  if (!error) {
    const amount = Number(data ?? 0);
    if (Number.isFinite(amount)) {
      return Math.max(fallback, Math.round(amount));
    }
  }

  return fallback;
}

async function upsertFinesResilient(
  rows: Array<{ user_id: string; transaction_id: number; amount: number; status: "pending" }>,
) {
  const { error: upsertError } = await supabaseAdmin
    .from("fines")
    .upsert(rows, { onConflict: "transaction_id" });

  if (!upsertError) {
    return;
  }

  // Fallback path for environments where transaction_id uniqueness is not enforced
  // and ON CONFLICT(transaction_id) cannot be used.
  for (const row of rows) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("fines")
      .select("id,paid_at")
      .eq("transaction_id", row.transaction_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || "Could not inspect existing fine row.");
    }

    if (existing?.id) {
      // Never rewrite a paid fine in sync.
      if (existing.paid_at) continue;

      const { error: updateError } = await supabaseAdmin
        .from("fines")
        .update({ amount: row.amount, status: "pending" })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message || "Could not update fine row.");
      }

      continue;
    }

    const { error: insertError } = await supabaseAdmin
      .from("fines")
      .insert(row);

    if (insertError) {
      throw new Error(insertError.message || "Could not insert fine row.");
    }
  }
}

export async function syncOutstandingFinesForUser(userId: string) {
  const finePerDay = await getFinePerDaySetting();

  const { data: openTransactions, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,due_date,status")
    .eq("user_id", userId)
    .is("return_date", null);

  if (txError) {
    throw new Error(txError.message || "Could not load overdue transactions for fine sync.");
  }

  const rows = ((openTransactions ?? []) as TransactionFineCandidate[]).filter(
    (tx) => tx.status === "overdue" || isDbTimestampPast(tx.due_date),
  );
  if (rows.length === 0) {
    return { upserted: 0, cleared: 0 };
  }

  const upserts: Array<{ user_id: string; transaction_id: number; amount: number; status: "pending" }> = [];
  const clearIds: number[] = [];

  for (const tx of rows) {
    const amount = await calculateFineAmountForTransaction(tx.id, tx.due_date, finePerDay);
    if (amount > 0) {
      upserts.push({
        user_id: tx.user_id,
        transaction_id: tx.id,
        amount,
        status: "pending",
      });
    } else {
      clearIds.push(tx.id);
    }
  }

  if (upserts.length > 0) {
    await upsertFinesResilient(upserts);
  }

  if (clearIds.length > 0) {
    const { error: clearError } = await supabaseAdmin
      .from("fines")
      .delete()
      .eq("user_id", userId)
      .is("paid_at", null)
      .in("transaction_id", clearIds);

    if (clearError) {
      throw new Error(clearError.message || "Could not clear zero-value fines.");
    }
  }

  return { upserted: upserts.length, cleared: clearIds.length };
}
