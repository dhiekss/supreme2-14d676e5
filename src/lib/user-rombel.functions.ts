import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error(`Forbidden: ${error.message}`);
  if (!data) throw new Error("Forbidden: hanya admin yang dapat mengatur akses rombel");
}

export const listRombelForAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rombel")
      .select("id, name, tingkat, konsentrasi_keahlian")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getUserRombels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_rombel")
      .select("rombel_id")
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { rombel_ids: (rows ?? []).map((r: any) => r.rombel_id).filter(Boolean) };
  });

export const setUserRombels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    rombel_ids: z.array(z.string().uuid()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: derr } = await supabaseAdmin
      .from("user_rombel")
      .delete()
      .eq("user_id", data.user_id);
    if (derr) throw new Error(derr.message);
    const uniq = Array.from(new Set(data.rombel_ids.filter(Boolean)));
    if (uniq.length > 0) {
      const payload = uniq.map((rombel_id) => ({ user_id: data.user_id, rombel_id }));
      const { error } = await supabaseAdmin.from("user_rombel").insert(payload);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "set_user_rombels",
      description: `Set akses rombel (${uniq.length} rombel) untuk 1 user`,
    });
    return { ok: true, count: uniq.length };
  });

export const bulkSetUserRombels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_ids: z.array(z.string().uuid()).min(1),
    rombel_ids: z.array(z.string().uuid()),
    mode: z.enum(["replace", "append", "remove"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uniq = Array.from(new Set(data.rombel_ids.filter(Boolean)));

    if (data.mode === "replace") {
      const { error: derr } = await supabaseAdmin
        .from("user_rombel")
        .delete()
        .in("user_id", data.user_ids);
      if (derr) throw new Error(derr.message);
      if (uniq.length > 0) {
        const payload = data.user_ids.flatMap((uid) =>
          uniq.map((rombel_id) => ({ user_id: uid, rombel_id })),
        );
        const { error } = await supabaseAdmin.from("user_rombel").insert(payload);
        if (error) throw new Error(error.message);
      }
    } else if (data.mode === "append") {
      if (uniq.length === 0) return { ok: true, affected: data.user_ids.length };
      const { data: existing } = await supabaseAdmin
        .from("user_rombel")
        .select("user_id, rombel_id")
        .in("user_id", data.user_ids);
      const existingSet = new Set(
        (existing ?? []).map((r: any) => `${r.user_id}::${r.rombel_id}`),
      );
      const payload = data.user_ids.flatMap((uid) =>
        uniq
          .filter((k) => !existingSet.has(`${uid}::${k}`))
          .map((rombel_id) => ({ user_id: uid, rombel_id })),
      );
      if (payload.length > 0) {
        const { error } = await supabaseAdmin.from("user_rombel").insert(payload);
        if (error) throw new Error(error.message);
      }
    } else if (data.mode === "remove") {
      if (uniq.length === 0) return { ok: true, affected: data.user_ids.length };
      const { error } = await supabaseAdmin
        .from("user_rombel")
        .delete()
        .in("user_id", data.user_ids)
        .in("rombel_id", uniq);
      if (error) throw new Error(error.message);
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "bulk_set_user_rombels",
      description: `${data.mode} akses rombel (${uniq.length} rombel) untuk ${data.user_ids.length} user`,
    });
    return { ok: true, affected: data.user_ids.length };
  });
