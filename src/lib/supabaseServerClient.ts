import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceRole) {
  // keep it quiet in production; server code will throw if used incorrectly
  // but this helps development surface missing config early
  // eslint-disable-next-line no-console
  console.warn("Supabase service role client missing configuration");
}

export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

export default supabaseAdmin;
