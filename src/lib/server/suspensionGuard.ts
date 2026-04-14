import supabaseAdmin from "@/lib/supabaseServerClient";

type SuspensionCheck =
  | { allowed: true }
  | { allowed: false; message: string };

type ProfileRow = {
  status?: string | null;
};

export async function ensureActionAllowedForUser(userId: string): Promise<SuspensionCheck> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { allowed: false, message: "Could not verify account status. Please try again." };
  }

  const status = ((profile as ProfileRow | null)?.status ?? "active").toLowerCase();
  if (status !== "suspended") {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: "Your account is suspended. You can't perform this action.",
  };
}
