import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LayoutNode } from "@/lib/sidebar-menu";

export const ROLES = [
  "superadmin",
  "admin",
  "wakasek",
  "kakonli",
  "walas",
  "guru",
  "murid",
  "tendik",
  "admin_sarpras",
  "admin_persuratan",
  "admin_tpg",
] as const;

export type Role = (typeof ROLES)[number];

async function assertAdmin(ctx: {
  supabase: any;
  userId: string;
}) {
  const { data, error } = await ctx.supabase.rpc("is_admin", {
    _user_id: ctx.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getMyMenuLayout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles: Role[] = (roleRows ?? []).map((r: any) => r.role);
    // Priority: superadmin > admin > wakasek > kakonli > walas > admin_* > guru > murid
    const priority: Role[] = [
      "superadmin",
      "admin",
      "wakasek",
      "kakonli",
      "walas",
      "admin_persuratan",
      "admin_sarpras",
      "admin_tpg",
      "tendik",
      "guru",
      "murid",
    ];
    const role: Role = priority.find((p) => roles.includes(p)) ?? "guru";


    // Superadmin selalu memperoleh akses penuh ke seluruh menu default —
    // di atas admin dan tidak dapat dibatasi oleh layout tersimpan.
    if (role === "superadmin") {
      return { role, layout: null };
    }

    const { data } = await context.supabase
      .from("menu_layouts")
      .select("layout")
      .eq("role", role)
      .maybeSingle();

    return { role, layout: (data?.layout as LayoutNode[] | null) ?? null };
  });

export const listMenuLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("menu_layouts")
      .select("role, layout, updated_at");
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as { role: Role; layout: LayoutNode[]; updated_at: string }[] };
  });

export const saveMenuLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: Role; layout: LayoutNode[] }) => {
    if (!ROLES.includes(input.role)) throw new Error("Invalid role");
    if (!Array.isArray(input.layout)) throw new Error("Invalid layout");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("menu_layouts")
      .upsert(
        {
          role: data.role,
          layout: data.layout,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "role" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetMenuLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: Role }) => {
    if (!ROLES.includes(input.role)) throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("menu_layouts")
      .delete()
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyMenuLayoutToAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { layout: LayoutNode[]; roles?: Role[] }) => {
    if (!Array.isArray(input.layout)) throw new Error("Invalid layout");
    if (input.roles) {
      if (!Array.isArray(input.roles) || input.roles.length === 0) throw new Error("Pilih minimal satu role");
      if (input.roles.some((r) => !ROLES.includes(r))) throw new Error("Invalid role");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const targets = data.roles ? Array.from(new Set(data.roles)) : [...ROLES];
    const rows = targets.map((role) => ({
      role,
      layout: data.layout,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await context.supabase
      .from("menu_layouts")
      .upsert(rows, { onConflict: "role" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });
