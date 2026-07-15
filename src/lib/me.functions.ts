import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    const roles: string[] = (roleRows ?? []).map((r: any) => r.role);
    const priority = [
      "superadmin",
      "admin",
      "wakasek",
      "kakonli",
      "walas",
      "admin_persuratan",
      "admin_sarpras",
      "admin_tpg",
      "guru",
      "murid",
    ];
    const primary = priority.find((p) => roles.includes(p)) ?? roles[0] ?? null;
    return {
      id: context.userId,
      email: (profile as any)?.email ?? context.claims?.email ?? null,
      full_name: (profile as any)?.full_name ?? null,
      avatar_url: null as string | null,
      role: primary,
      roles,
    };
  });
