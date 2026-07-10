import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAktivitas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; action?: string; limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.action) q = q.eq("action", data.action);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`user_email.ilike.${s},user_full_name.ilike.${s},description.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAktivitas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { action: string; description?: string; metadata?: any }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prof } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId,
      user_email: prof?.email ?? null,
      user_full_name: prof?.full_name ?? null,
      action: data.action,
      description: data.description ?? null,
      metadata: data.metadata ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAktivitas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("activity_logs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearOldAktivitas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { olderThanDays: number }) => d)
  .handler(async ({ data, context }) => {
    const cutoff = new Date(Date.now() - data.olderThanDays * 86400_000).toISOString();
    const { error, count } = await context.supabase
      .from("activity_logs")
      .delete({ count: "exact" })
      .lt("created_at", cutoff);
    if (error) throw new Error(error.message);
    return { deleted: count ?? 0 };
  });

export const aktivitasSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const [{ count: total }, { count: todayCnt }, { count: weekCnt }, { data: actions }] = await Promise.all([
      supabase.from("activity_logs").select("id", { count: "exact", head: true }),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      supabase.from("activity_logs").select("action").order("created_at", { ascending: false }).limit(500),
    ]);
    const byAction: Record<string, number> = {};
    (actions ?? []).forEach((r: any) => {
      const a = r.action ?? "unknown";
      byAction[a] = (byAction[a] ?? 0) + 1;
    });
    return { total: total ?? 0, today: todayCnt ?? 0, week: weekCnt ?? 0, byAction };
  });
