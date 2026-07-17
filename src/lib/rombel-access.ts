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
  const [urRes, profRes] = await Promise.all([
    supabase.from("user_rombel").select("rombel_id").eq("user_id", userId),
    supabase.from("profiles").select("nip").eq("id", userId).maybeSingle(),
  ]);
  if (urRes.error) throw new Error(urRes.error.message);
  const ids = new Set<string>(
    (urRes.data ?? []).map((r: any) => r.rombel_id).filter(Boolean) as string[],
  );
  const nip = (profRes.data as any)?.nip ?? null;
  if (nip) {
    const { data: waliRows, error: waliErr } = await supabase
      .from("rombel")
      .select("id")
      .eq("wali_kelas_nip", nip);
    if (waliErr) throw new Error(waliErr.message);
    (waliRows ?? []).forEach((r: any) => r.id && ids.add(r.id));
  }
  return Array.from(ids);
}
