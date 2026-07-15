// Server-only helper for enforcing "Akses Rombel" from user_rombel.
// Returns:
//   null       -> user is admin/superadmin (no filtering, sees all)
//   string[]   -> allowed rombel ids for this user (may be empty)
//
// Callers should:
//   - if result === null: do not filter
//   - else: filter rombel_id ∈ result (return [] when empty)
export async function getAllowedRombelIds(
  supabase: any,
  userId: string,
): Promise<string[] | null> {
  const [{ data: isAdmin }, { data: isSuper }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "superadmin" }),
  ]);
  if (isAdmin || isSuper) return null;
  const { data, error } = await supabase
    .from("user_rombel")
    .select("rombel_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return Array.from(
    new Set((data ?? []).map((r: any) => r.rombel_id).filter(Boolean)),
  ) as string[];
}
