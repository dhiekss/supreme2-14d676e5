import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listNotifikasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { type?: string; status?: string; limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notification_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.type && data.type !== "all") q = q.eq("type", data.type);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createNotifikasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    type: string;
    recipientPhone: string;
    recipientName?: string;
    message: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notification_logs").insert({
      type: data.type,
      recipient_phone: data.recipientPhone,
      recipient_name: data.recipientName ?? null,
      message: data.message,
      status: "pending",
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateNotifikasiStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_logs")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotifikasi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_logs")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const summaryNotifikasi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notification_logs")
      .select("status")
      .limit(1000);
    if (error) throw new Error(error.message);
    const acc = { total: data?.length ?? 0, pending: 0, sent: 0, failed: 0 };
    (data ?? []).forEach((r: any) => {
      if (r.status === "pending") acc.pending++;
      else if (r.status === "sent" || r.status === "delivered") acc.sent++;
      else if (r.status === "failed") acc.failed++;
    });
    return acc;
  });
