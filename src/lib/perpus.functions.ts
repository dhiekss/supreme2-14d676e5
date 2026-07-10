import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ search: z.string().optional() }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("books").select("id, judul, penulis, jenis_buku, isbn, tahun_pengadaan, jumlah_tersedia").order("judul").limit(500);
    if (data.search) q = q.or(`judul.ilike.%${data.search}%,penulis.ilike.%${data.search}%,isbn.ilike.%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid().optional(),
      judul: z.string().min(1).max(255),
      penulis: z.string().max(255).optional(),
      jenisBuku: z.string().max(100).optional(),
      isbn: z.string().max(50).optional(),
      tahunPengadaan: z.number().int().optional(),
      jumlahTersedia: z.number().int().min(0),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const payload: any = {
      judul: data.judul,
      penulis: data.penulis ?? null,
      jenis_buku: data.jenisBuku ?? null,
      isbn: data.isbn ?? null,
      tahun_pengadaan: data.tahunPengadaan ?? null,
      jumlah_tersedia: data.jumlahTersedia,
    };
    if (data.id) {
      const { error } = await context.supabase.from("books").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      payload.created_by = context.userId;
      const { error } = await context.supabase.from("books").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("books").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLoans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.string().default("all") }).parse)
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("book_loans")
      .select("id, borrower_type, borrower_name, rombel_id, book_ids, tanggal_peminjaman, tanggal_pengembalian, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const allBookIds = new Set<string>();
    for (const r of rows ?? []) {
      const ids = Array.isArray(r.book_ids) ? r.book_ids as string[] : [];
      ids.forEach((x) => allBookIds.add(x));
    }
    const rids = [...new Set((rows ?? []).map((r) => r.rombel_id).filter(Boolean) as string[])];
    const [books, rombel] = await Promise.all([
      allBookIds.size ? context.supabase.from("books").select("id, judul").in("id", [...allBookIds]) : Promise.resolve({ data: [] }),
      rids.length ? context.supabase.from("rombel").select("id, name").in("id", rids) : Promise.resolve({ data: [] }),
    ]);
    const bMap = new Map((books.data ?? []).map((b: any) => [b.id, b.judul]));
    const rMap = new Map((rombel.data ?? []).map((r: any) => [r.id, r.name]));

    return (rows ?? []).map((r) => ({
      ...r,
      book_titles: (Array.isArray(r.book_ids) ? r.book_ids as string[] : []).map((x) => bMap.get(x) ?? "?"),
      rombel_name: r.rombel_id ? rMap.get(r.rombel_id) ?? "—" : "—",
    }));
  });

export const createLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      borrowerType: z.enum(["siswa", "guru", "umum"]),
      borrowerName: z.string().min(1).max(255),
      borrowerId: z.string().uuid().optional(),
      rombelId: z.string().uuid().optional(),
      bookIds: z.array(z.string().uuid()).min(1),
      tanggalPeminjaman: z.string(),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("book_loans").insert({
      borrower_type: data.borrowerType,
      borrower_name: data.borrowerName,
      borrower_id: data.borrowerId ?? null,
      rombel_id: data.rombelId ?? null,
      book_ids: data.bookIds,
      tanggal_peminjaman: data.tanggalPeminjaman,
      status: "dipinjam",
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const returnLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("book_loans").update({
      status: "kembali",
      tanggal_pengembalian: new Date().toISOString().slice(0, 10),
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("book_loans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
