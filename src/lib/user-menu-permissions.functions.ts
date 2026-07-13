import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error(`Forbidden: ${error.message}`);
  if (!data) throw new Error("Forbidden: hanya admin yang dapat mengatur akses menu");
}

export const getUserMenus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_menu_permissions")
      .select("menu_key")
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { menu_keys: (rows ?? []).map((r: any) => r.menu_key).filter(Boolean) };
  });

export const setUserMenus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    menu_keys: z.array(z.string()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: derr } = await supabaseAdmin
      .from("user_menu_permissions")
      .delete()
      .eq("user_id", data.user_id);
    if (derr) throw new Error(derr.message);
    const uniq = Array.from(new Set(data.menu_keys.filter(Boolean)));
    if (uniq.length > 0) {
      const payload = uniq.map((menu_key) => ({ user_id: data.user_id, menu_key }));
      const { error } = await supabaseAdmin.from("user_menu_permissions").insert(payload);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "set_user_menus",
      description: `Set akses menu (${uniq.length} menu) untuk 1 user`,
    });
    return { ok: true, count: uniq.length };
  });

export const bulkSetUserMenus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_ids: z.array(z.string().uuid()).min(1),
    menu_keys: z.array(z.string()),
    mode: z.enum(["replace", "append", "remove"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uniq = Array.from(new Set(data.menu_keys.filter(Boolean)));

    if (data.mode === "replace") {
      const { error: derr } = await supabaseAdmin
        .from("user_menu_permissions")
        .delete()
        .in("user_id", data.user_ids);
      if (derr) throw new Error(derr.message);
      if (uniq.length > 0) {
        const payload = data.user_ids.flatMap((uid) =>
          uniq.map((menu_key) => ({ user_id: uid, menu_key })),
        );
        const { error } = await supabaseAdmin.from("user_menu_permissions").insert(payload);
        if (error) throw new Error(error.message);
      }
    } else if (data.mode === "append") {
      if (uniq.length === 0) return { ok: true, affected: data.user_ids.length };
      // Ambil yang sudah ada agar tidak duplikat (tabel tidak punya unique constraint).
      const { data: existing } = await supabaseAdmin
        .from("user_menu_permissions")
        .select("user_id, menu_key")
        .in("user_id", data.user_ids);
      const existingSet = new Set(
        (existing ?? []).map((r: any) => `${r.user_id}::${r.menu_key}`),
      );
      const payload = data.user_ids.flatMap((uid) =>
        uniq
          .filter((k) => !existingSet.has(`${uid}::${k}`))
          .map((menu_key) => ({ user_id: uid, menu_key })),
      );
      if (payload.length > 0) {
        const { error } = await supabaseAdmin.from("user_menu_permissions").insert(payload);
        if (error) throw new Error(error.message);
      }
    } else if (data.mode === "remove") {
      if (uniq.length === 0) return { ok: true, affected: data.user_ids.length };
      const { error } = await supabaseAdmin
        .from("user_menu_permissions")
        .delete()
        .in("user_id", data.user_ids)
        .in("menu_key", uniq);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "bulk_set_user_menus",
      description: `${data.mode} akses menu (${uniq.length} menu) untuk ${data.user_ids.length} user`,
    });
    return { ok: true, affected: data.user_ids.length };
  });
