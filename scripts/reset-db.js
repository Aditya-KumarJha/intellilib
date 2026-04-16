import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

function log(step, msg) {
  console.log(`🔹 [${step}] ${msg}`);
}

function errorLog(step, err) {
  console.error(`❌ [${step}] ${err.message}`);
}

async function getAllTables() {
  const { data, error } = await supabase.rpc("get_all_tables");
  if (error) throw error;
  return data;
}

async function deleteAllData() {
  log("START", "NUKING DB (TRUNCATE CASCADE)...");

  const { error } = await supabase.rpc("nuke_db");

  if (error) throw error;

  log("SUCCESS", "All tables truncated");
}

async function deleteAllAuthUsers() {
  log("AUTH", "Deleting all users...");

  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const users = data.users;

    if (!users.length) break;

    for (const user of users) {
      try {
        log("AUTH DELETE", user.email);

        const { error } = await supabase.auth.admin.deleteUser(user.id);

        if (error) throw error;

        log("AUTH SUCCESS", user.email);
      } catch (err) {
        errorLog(user.email, err);
      }
    }

    page++;
  }
}

async function resetDB() {
  try {
    console.log("🚨 STARTING FULL DATABASE RESET\n");

    await deleteAllData();
    await deleteAllAuthUsers();

    console.log("\n✅ DATABASE RESET COMPLETE");
  } catch (err) {
    console.error("\n💥 RESET FAILED:", err.message);
  }
}

resetDB();