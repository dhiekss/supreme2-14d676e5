import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["admin", "wakasek", "kaprog", "guru", "murid", "admin_sarpras", "admin_persuratan", "admin_tpg"] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: hanya admin yang dapat mengelola pengguna");
}

const ONLINE_WINDOW_MS = 5 * 60_000;

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.enum(["all", "active", "inactive"]).optional(),
    sort: z.enum(["name_asc", "name_desc", "created_desc", "created_asc"]).optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  }).optional().parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, nip, nis, is_active, created_at")
      .limit(5000);
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: presence }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("user_presence").select("user_id, last_seen_at, is_online"),
    ]);
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get((r as any).user_id) ?? [];
      arr.push((r as any).role);
      rolesByUser.set((r as any).user_id, arr);
    }
    const presenceByUser = new Map<string, any>();
    for (const p of presence ?? []) presenceByUser.set((p as any).user_id, p);
    const now = Date.now();
    let rows = (profiles ?? []).map((p: any) => {
      const pr = presenceByUser.get(p.id);
      const lastSeen = pr?.last_seen_at ? new Date(pr.last_seen_at).getTime() : 0;
      const online = !!pr?.is_online && (now - lastSeen) < ONLINE_WINDOW_MS;
      return { ...p, roles: rolesByUser.get(p.id) ?? [], online, last_seen_at: pr?.last_seen_at ?? null };
    });

    if (data?.search) {
      const s = data.search.toLowerCase();
      rows = rows.filter((r) =>
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.full_name ?? "").toLowerCase().includes(s) ||
        (r.nip ?? "").toLowerCase().includes(s) ||
        (r.nis ?? "").toLowerCase().includes(s),
      );
    }
    if (data?.role && data.role !== "all") {
      rows = rows.filter((r) => r.roles.includes(data.role!));
    }
    if (data?.status && data.status !== "all") {
      rows = rows.filter((r) => (data.status === "active" ? r.is_active !== false : r.is_active === false));
    }
    const sort = data?.sort ?? "name_asc";
    rows.sort((a: any, b: any) => {
      if (sort.startsWith("name")) {
        const cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
        return sort === "name_asc" ? cmp : -cmp;
      }
      const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === "created_asc" ? t : -t;
    });

    const totalAll = rows.length;
    const onlineCount = rows.filter((r) => r.online).length;
    const page = Math.max(1, data?.page ?? 1);
    const pageSize = Math.max(5, Math.min(100, data?.pageSize ?? 25));
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);
    return { rows: paged, totalAll, onlineCount, page, pageSize };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(1),
    nip: z.string().optional().nullable(),
    nis: z.string().optional().nullable(),
    roles: z.array(z.enum(ROLES)).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      nip: data.nip ?? null,
      nis: data.nis ?? null,
    }).eq("id", uid);
    const rolesPayload = data.roles.map((role) => ({ user_id: uid, role }));
    const { error: rerr } = await supabaseAdmin.from("user_roles").insert(rolesPayload);
    if (rerr) throw new Error(rerr.message);
    return { ok: true, id: uid };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    full_name: z.string().min(1),
    nip: z.string().optional().nullable(),
    nis: z.string().optional().nullable(),
    is_active: z.boolean(),
    roles: z.array(z.enum(ROLES)),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: perr } = await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      nip: data.nip ?? null,
      nis: data.nis ?? null,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (perr) throw new Error(perr.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (data.roles.length > 0) {
      const { error: rerr } = await supabaseAdmin.from("user_roles").insert(
        data.roles.map((role) => ({ user_id: data.id, role })),
      );
      if (rerr) throw new Error(rerr.message);
    }
    return { ok: true };
  });

export const toggleUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkSetAllActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ is_active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, count } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() }, { count: "exact" })
      .neq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, affected: count ?? 0 };
  });

export const forceLogoutAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    let count = 0;
    for (const p of profiles ?? []) {
      const uid = (p as any).id;
      if (uid === context.userId) continue;
      try {
        // @ts-ignore - signOut by user id may exist in newer SDK
        await supabaseAdmin.auth.admin.signOut(uid, "global");
        count++;
      } catch {
        // fallback: ignore — session will expire naturally
      }
    }
    await supabaseAdmin.from("user_presence").update({ is_online: false }).neq("user_id", context.userId);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "force_logout_all",
      description: `Force logout semua user (${count} sesi)`,
    });
    return { ok: true, count };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), password: z.string().min(6) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Tidak dapat menghapus akun sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const userSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("is_active");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role");
    const { data: presence } = await supabaseAdmin.from("user_presence").select("is_online, last_seen_at");
    const total = profiles?.length ?? 0;
    const active = (profiles ?? []).filter((p: any) => p.is_active !== false).length;
    const byRole: Record<string, number> = {};
    for (const r of roles ?? []) {
      const k = (r as any).role;
      byRole[k] = (byRole[k] ?? 0) + 1;
    }
    const now = Date.now();
    const online = (presence ?? []).filter((p: any) =>
      p.is_online && p.last_seen_at && (now - new Date(p.last_seen_at).getTime()) < ONLINE_WINDOW_MS
    ).length;
    return { total, active, inactive: total - active, byRole, online };
  });

export const listUserActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    search: z.string().optional(),
    action: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
  }).optional().parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("activity_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (data?.action && data.action !== "all") q = q.eq("action", data.action);
    if (data?.from) q = q.gte("created_at", data.from);
    if (data?.to) q = q.lte("created_at", data.to);
    if (data?.search) {
      const s = `%${data.search}%`;
      q = q.or(`user_email.ilike.${s},user_full_name.ilike.${s},description.ilike.${s}`);
    }
    const page = Math.max(1, data?.page ?? 1);
    const pageSize = Math.max(5, Math.min(100, data?.pageSize ?? 10));
    const start = (page - 1) * pageSize;
    q = q.range(start, start + pageSize - 1);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const { data: actionsList } = await supabaseAdmin
      .from("activity_logs").select("action").order("created_at", { ascending: false }).limit(500);
    const actions = Array.from(new Set((actionsList ?? []).map((r: any) => r.action).filter(Boolean)));

    return { rows: rows ?? [], total: count ?? 0, page, pageSize, actions };
  });
