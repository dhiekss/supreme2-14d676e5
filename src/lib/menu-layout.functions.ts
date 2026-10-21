import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LayoutNode } from "@/lib/sidebar-menu";
import { ROLES, getPrimaryRole, type Role } from "@/lib/roles";
export { ROLES, type Role } from "@/lib/roles";

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
    const role: Role = getPrimaryRole(roles) ?? "guru";


    // Superadmin memakai layout tersimpan bila ada; tanpa layout → menu default penuh.

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
