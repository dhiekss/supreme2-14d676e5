import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPrimaryRole } from "@/lib/roles";

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
    const primary = getPrimaryRole(roles) ?? roles[0] ?? null;
    return {
      id: context.userId,
      email: (profile as any)?.email ?? context.claims?.email ?? null,
      full_name: (profile as any)?.full_name ?? null,
      avatar_url: null as string | null,
      role: primary,
      roles,
    };
  });
