import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Pencil, Trash2, Lock, LockOpen, Search, Upload, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listSuratKeluar, saveSuratKeluar, deleteSuratKeluar, deleteAllSuratKeluar, bulkImportSuratKeluar,
  listNomorDiamankan, amankanNomor, deleteNomorDiamankan, nextNomorUrut,
} from "@/lib/surat-keluar.functions";
import { listKode, listNomor } from "@/lib/persuratan.functions";

function applyFormatNomor(format: string, kode: string, nomor: number | string, tahun: number) {
  const n = Number(nomor) || 0;
  const padded = n > 0 ? String(n).padStart(3, "0") : "";
  return (format || "")
    .replaceAll("{KODE}", kode || "")
    .replaceAll("{NOMOR}", padded)
    .replaceAll("{TAHUN}", String(tahun))
    .replaceAll("{kode}", kode || "")
    .replaceAll("{counter}", padded)
    .replaceAll("{tahun}", String(tahun));
}

export const Route = createFileRoute("/_authenticated/persuratan/surat-keluar")({
  head: () => ({ meta: [{ title: "Surat Keluar — SUPREME XPOES" }] }),
  component: Page,
});

const JENIS_OPTIONS = [
  "Surat Keterangan",
  "Pemberitahuan",
  "Permohonan",
  "Undangan",
  "Surat Tugas & SPPD",
  "Edaran",
  "Lainnya",
];
const SIFAT_OPTIONS = ["Biasa", "Segera", "Sangat Segera", "Rahasia"];
const STATUS_OPTIONS = ["draft", "aktif", "arsip"] as const;

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(s?: string | null) {
  const v = (s ?? "draft").toLowerCase();
  const cls =
    v === "draft" ? "bg-slate-100 text-slate-700 border-slate-200"
    : v === "aktif" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  return <Badge variant="outline" className={cls}>{v}</Badge>;
}

function jenisBadge(j?: string | null) {
  const isTugas = (j ?? "").toLowerCase().includes("tugas");
  if (isTugas) return <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-0">{j}</Badge>;
  return <Badge variant="outline" className="border-slate-200 text-slate-700">{j || "—"}</Badge>;
}

function Page() {
  const qc = useQueryClient();
  const fnList = useServerFn(listSuratKeluar);
  const fnKode = useServerFn(listKode);
  const fnNomor = useServerFn(listNomor);
  const fnReserved = useServerFn(listNomorDiamankan);
  const fnDel = useServerFn(deleteSuratKeluar);
  const fnDelReserved = useServerFn(deleteNomorDiamankan);

  const { data: rows } = useSuspenseQuery({ queryKey: ["surat-keluar"], queryFn: () => fnList() });
  const { data: kodeList = [] } = useQuery({ queryKey: ["kode-surat"], queryFn: () => fnKode() });
  const { data: nomorList = [] } = useQuery({ queryKey: ["persuratan-nomor"], queryFn: () => fnNomor() });
  const { data: reserved = [] } = useQuery({ queryKey: ["nomor-diamankan"], queryFn: () => fnReserved() });

  const formatSuratKeluar = useMemo(() => {
    const row = (nomorList as any[]).find(
      (n) => n.jenis_surat === "surat_keluar" && n.is_active !== false,
    ) ?? (nomorList as any[]).find((n) => n.jenis_surat === "surat_keluar");
    return row?.format_nomor ?? "{KODE}/{NOMOR}/SMKN1.PN-CADISDIK.WIL.IV/{TAHUN}";
  }, [nomorList]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [kode, setKode] = useState("all");
  const [bulan, setBulan] = useState("all");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [prefill, setPrefill] = useState<{ kode: string; nomor: number; reservedId: string } | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r: any) => {
      if (status !== "all" && (r.status ?? "draft").toLowerCase() !== status) return false;
      if (kode !== "all" && r.kode_surat !== kode) return false;
      if (bulan !== "all" && r.tanggal_surat) {
        const m = new Date(r.tanggal_surat).getMonth() + 1;
        if (String(m).padStart(2, "0") !== bulan) return false;
      }
      if (dari && r.tanggal_surat && r.tanggal_surat < dari) return false;
      if (sampai && r.tanggal_surat && r.tanggal_surat > sampai) return false;
      if (!s) return true;
      return `${r.nomor_surat ?? ""} ${r.tujuan ?? ""} ${r.perihal ?? ""}`.toLowerCase().includes(s);
    });
  }, [rows, q, status, kode, bulan, dari, sampai]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalReservedTersedia = (reserved ?? []).filter((r: any) => r.status === "tersedia").length;

  const del = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("Surat dihapus"); qc.invalidateQueries({ queryKey: ["surat-keluar"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delReserved = useMutation({
    mutationFn: (id: string) => fnDelReserved({ data: { id } }),
    onSuccess: () => { toast.success("Nomor dibatalkan"); qc.invalidateQueries({ queryKey: ["nomor-diamankan"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const fnDelAll = useServerFn(deleteAllSuratKeluar);
  const fnBulk = useServerFn(bulkImportSuratKeluar);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [confirmDelAll, setConfirmDelAll] = useState(false);

  const delAll = useMutation({
    mutationFn: () => fnDelAll(),
    onSuccess: (r: any) => {
      toast.success(`${r?.deleted ?? 0} surat dihapus`);
      setConfirmDelAll(false);
      qc.invalidateQueries({ queryKey: ["surat-keluar"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: (rows: any[]) => fnBulk({ data: { rows } }),
    onSuccess: (r: any) => {
      toast.success(`${r?.inserted ?? 0} surat diimpor`);
      qc.invalidateQueries({ queryKey: ["surat-keluar"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const header = [
      "Kode Surat", "No. Urut", "No. Surat", "Tanggal", "Tujuan", "Perihal", "Jenis", "Sifat", "Status",
    ];
    const sample = [
      ["421.5", 661, "421.5/661/SMKN1.PN-CADISDIK.WIL.IV/2026", "2026-07-30", "SMK NU GHOFARONA", "Surat keterangan pindah sekolah", "Surat Keterangan", "Biasa", "draft"],
      ["805", 729, "805/729/SMKN1.PN-CADISDIK.WIL.IV/2026", "2026-07-09", "SMK Negeri 1 Purwakarta", "Menghadiri Undangan Sosialisasi", "Surat Tugas & SPPD", "Biasa", "aktif"],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);
    ws["!cols"] = [{ wch: 10 }, { wch: 9 }, { wch: 40 }, { wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surat Keluar");
    XLSX.writeFile(wb, `template-surat-keluar.xlsx`);
  };

  const parseTanggal = (v: any): string => {
    if (v == null || v === "") return "";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") {
      // Excel serial date
      const d = XLSX.SSF ? new Date(Math.round((v - 25569) * 86400 * 1000)) : new Date(v);
      return d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    // dd-MMM-yy or dd-MM-yyyy or yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m1 = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (m1) {
      const [, d, mo, y] = m1;
      const yr = y.length === 2 ? `20${y}` : y;
      return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const m2 = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})$/);
    if (m2) {
      const [, d, mon, y] = m2;
      const months: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", mei: "05", jun: "06",
        jul: "07", aug: "08", agu: "08", sep: "09", oct: "10", okt: "10", nov: "11", dec: "12", des: "12",
      };
      const mm = months[mon.slice(0, 3).toLowerCase()];
      if (mm) {
        const yr = y.length === 2 ? `20${y}` : y;
        return `${yr}-${mm}-${d.padStart(2, "0")}`;
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  };

  const handleImportFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (raw.length === 0) return toast.error("File kosong");
      const rows = raw.map((r: any, i: number) => {
        const kode = String(r["Kode Surat"] ?? r["kode_surat"] ?? "").trim();
        const nomor = Number(r["No. Urut"] ?? r["nomor_urut"] ?? 0);
        const nomorSurat = String(r["No. Surat"] ?? r["nomor_surat"] ?? "").trim();
        const tanggal = parseTanggal(r["Tanggal"] ?? r["tanggal_surat"]);
        const tujuan = String(r["Tujuan"] ?? r["tujuan"] ?? "").trim();
        const perihal = String(r["Perihal"] ?? r["perihal"] ?? "").trim();
        const jenis = String(r["Jenis"] ?? r["jenis_surat"] ?? "").trim();
        const sifat = String(r["Sifat"] ?? r["sifat_surat"] ?? "Biasa").trim() || "Biasa";
        const status = String(r["Status"] ?? r["status"] ?? "draft").trim().toLowerCase() || "draft";
        if (!kode || !nomor || !nomorSurat || !tanggal || !tujuan || !perihal || !jenis) {
          throw new Error(`Baris ${i + 2}: data belum lengkap`);
        }
        return {
          kode_surat: kode, nomor_urut: nomor, nomor_surat: nomorSurat,
          tanggal_surat: tanggal, tujuan, perihal, jenis_surat: jenis,
          sifat_surat: sifat, status,
        };
      });
      importMut.mutate(rows);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membaca file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openCreate = () => { setEditing(null); setPrefill(null); setOpenForm(true); };
  const openEdit = (r: any) => { setEditing(r); setPrefill(null); setOpenForm(true); };
  const useReserved = (r: any) => {
    setEditing(null);
    setPrefill({ kode: r.kode_surat, nomor: r.nomor_urut, reservedId: r.id });
    setOpenForm(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Surat Keluar</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola surat keluar yang dikirim</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
        }}
      />

      {/* Daftar */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Daftar Surat Keluar</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Unduh Template
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importMut.isPending}
            >
              {importMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              Import Data
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmDelAll(true)}
              disabled={!(rows?.length)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Hapus Semua
            </Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Buat Surat Keluar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nomor surat, tujuan, perihal..." className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={kode} onValueChange={setKode}>
              <SelectTrigger><SelectValue placeholder="Semua Kode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kode</SelectItem>
                {(kodeList as any[]).map((k) => <SelectItem key={k.id} value={k.kode}>{k.kode} — {k.nama}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger><SelectValue placeholder="Semua Bulan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {Array.from({ length: 12 }).map((_, i) => {
                  const v = String(i + 1).padStart(2, "0");
                  const nama = new Date(2000, i, 1).toLocaleString("id-ID", { month: "long" });
                  return <SelectItem key={v} value={v}>{nama}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Dari:</span>
            <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="w-40" />
            <span>Sampai:</span>
            <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="w-40" />
            <div className="ml-auto text-muted-foreground">{filtered.length} data ditemukan</div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3 whitespace-nowrap">Kode Surat</th>
                  <th className="text-left p-3 whitespace-nowrap">No. Urut</th>
                  <th className="text-left p-3 whitespace-nowrap">No. Surat</th>
                  <th className="text-left p-3 whitespace-nowrap">Tanggal</th>
                  <th className="text-left p-3">Tujuan</th>
                  <th className="text-left p-3">Perihal</th>
                  <th className="text-left p-3 whitespace-nowrap">Jenis</th>
                  <th className="text-left p-3 whitespace-nowrap">Status</th>
                  <th className="text-right p-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">{r.kode_surat ?? "—"}</td>
                    <td className="p-3">{r.nomor_urut ?? "—"}</td>
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{r.nomor_surat ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.tanggal_surat)}</td>
                    <td className="p-3">{r.tujuan}</td>
                    <td className="p-3 max-w-xs"><div className="line-clamp-2">{r.perihal}</div></td>
                    <td className="p-3">{jenisBadge(r.jenis_surat)}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        {r.file_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={r.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus surat?")) del.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Tidak ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Previous</Button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const n = i + 1;
                return (
                  <Button key={n} variant={page === n ? "default" : "outline"} size="sm" onClick={() => setPage(n)}>{n}</Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nomor Diamankan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Nomor Urut Tersedia (Diamankan) — {totalReservedTersedia}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Amankan nomor urut untuk kode tertentu. Gunakan tombol "Gunakan" untuk membuat surat dengan nomor tersebut.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <AmankanForm kodeList={kodeList as any[]} onSaved={() => qc.invalidateQueries({ queryKey: ["nomor-diamankan"] })} />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Kode</th>
                  <th className="text-left p-3">Nomor Urut</th>
                  <th className="text-left p-3">Tanggal Diamankan</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(reserved as any[]).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-mono text-xs">{r.kode_surat}</td>
                    <td className="p-3 font-semibold">{r.nomor_urut}</td>
                    <td className="p-3">{fmtDate(r.tanggal_diamankan)}</td>
                    <td className="p-3">
                      {r.status === "tersedia"
                        ? <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50"><Lock className="h-3 w-3 mr-1" /> Tersedia</Badge>
                        : <Badge variant="outline" className="border-slate-200 text-slate-600">{r.status}</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2 justify-end">
                        {r.status === "tersedia" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => useReserved(r)}>
                            <LockOpen className="h-4 w-4 mr-1" /> Gunakan
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" onClick={() => { if (confirm("Hapus nomor diamankan?")) delReserved.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(reserved as any[]).length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada nomor yang diamankan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SuratFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        prefill={prefill}
        kodeList={kodeList as any[]}
        reservedCount={totalReservedTersedia}
        reserved={reserved as any[]}
        formatNomor={formatSuratKeluar}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["surat-keluar"] });
          qc.invalidateQueries({ queryKey: ["nomor-diamankan"] });
        }}
      />

      <AlertDialog open={confirmDelAll} onOpenChange={setConfirmDelAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SEMUA data Surat Keluar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus seluruh {rows?.length ?? 0} data surat keluar dan tidak dapat dibatalkan.
              Hanya admin yang dapat melakukan ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); delAll.mutate(); }}
              disabled={delAll.isPending}
            >
              {delAll.isPending ? "Menghapus..." : "Ya, Hapus Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AmankanForm({ kodeList, onSaved }: { kodeList: any[]; onSaved: () => void }) {
  const [kode, setKode] = useState("");
  const [nomor, setNomor] = useState("");
  const fn = useServerFn(amankanNomor);
  const nextFn = useServerFn(nextNomorUrut);
  const save = useMutation({
    mutationFn: () => fn({ data: { kode_surat: kode, nomor_urut: Number(nomor) } }),
    onSuccess: () => { toast.success("Nomor diamankan"); setNomor(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const autoNext = async () => {
    if (!kode) return toast.error("Pilih kode dulu");
    const r = await nextFn({ data: { kode_surat: kode } });
    setNomor(String(r.next));
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px] space-y-1">
        <Label className="text-xs">Kode Surat</Label>
        <Select value={kode} onValueChange={setKode}>
          <SelectTrigger><SelectValue placeholder="Pilih kode" /></SelectTrigger>
          <SelectContent>
            {kodeList.map((k) => <SelectItem key={k.id} value={k.kode}>{k.kode} — {k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="w-40 space-y-1">
        <Label className="text-xs">Nomor Urut</Label>
        <Input type="number" min={1} value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="mis. 100" />
      </div>
      <Button variant="outline" onClick={autoNext}>Auto</Button>
      <Button onClick={() => { if (!kode || !nomor) return toast.error("Lengkapi kode & nomor"); save.mutate(); }} disabled={save.isPending}>
        <Lock className="h-4 w-4 mr-1" /> Amankan
      </Button>
    </div>
  );
}

function SuratFormDialog({
  open, onOpenChange, editing, prefill, kodeList, reservedCount, reserved, formatNomor, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: any | null;
  prefill: { kode: string; nomor: number; reservedId: string } | null;
  kodeList: any[];
  reservedCount: number;
  reserved: any[];
  formatNomor: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const saveFn = useServerFn(saveSuratKeluar);
  const nextFn = useServerFn(nextNomorUrut);

  // Reset form when dialog opens
  useMemo(() => {
    if (!open) return;
    if (editing) {
      setForm({
        id: editing.id,
        kode_surat: editing.kode_surat ?? "",
        nomor_urut: editing.nomor_urut ?? "",
        nomor_surat: editing.nomor_surat ?? "",
        tanggal_surat: editing.tanggal_surat ?? "",
        tujuan: editing.tujuan ?? "",
        perihal: editing.perihal ?? "",
        jenis_surat: editing.jenis_surat ?? "",
        sifat_surat: editing.sifat_surat ?? "Biasa",
        isi_ringkas: editing.isi_ringkas ?? "",
        file_url: editing.file_url ?? "",
        status: editing.status ?? "draft",
        reserved_id: null,
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setForm({
        kode_surat: prefill?.kode ?? "",
        nomor_urut: prefill?.nomor ?? "",
        nomor_surat: "",
        tanggal_surat: today,
        tujuan: "",
        perihal: "",
        jenis_surat: "",
        sifat_surat: "Biasa",
        isi_ringkas: "",
        file_url: "",
        status: "draft",
        reserved_id: prefill?.reservedId ?? null,
      });
    }
    setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id, prefill?.reservedId]);

  const onKodeChange = async (kode: string) => {
    setForm((f: any) => ({ ...f, kode_surat: kode }));
    if (!editing && !form.nomor_urut && kode) {
      try {
        const r = await nextFn({ data: { kode_surat: kode } });
        setForm((f: any) => ({ ...f, nomor_urut: r.next }));
      } catch {}
    }
  };

  // Auto-generate nomor_surat display
  const nomorPreview = useMemo(() => {
    if (!form.kode_surat || !form.nomor_urut) return "";
    const year = form.tanggal_surat ? new Date(form.tanggal_surat).getFullYear() : new Date().getFullYear();
    return applyFormatNomor(formatNomor, form.kode_surat, form.nomor_urut, year);
  }, [form.kode_surat, form.nomor_urut, form.tanggal_surat, formatNomor]);

  const save = useMutation({
    mutationFn: async () => {
      let file_url = form.file_url ?? "";
      if (file) {
        const path = `surat-keluar/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("surat-files").upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data: signed } = await supabase.storage.from("surat-files").createSignedUrl(path, 60 * 60 * 24 * 365);
        file_url = signed?.signedUrl ?? "";
      }
      return saveFn({
        data: {
          ...form,
          nomor_urut: Number(form.nomor_urut),
          nomor_surat: form.nomor_surat || nomorPreview,
          file_url,
        },
      });
    },
    onSuccess: () => { toast.success("Surat disimpan"); onOpenChange(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.kode_surat) return toast.error("Kode surat wajib");
    if (!form.nomor_urut) return toast.error("Nomor urut wajib");
    if (!form.tanggal_surat) return toast.error("Tanggal wajib");
    if (!form.tujuan) return toast.error("Tujuan wajib");
    if (!form.perihal) return toast.error("Perihal wajib");
    if (!form.jenis_surat) return toast.error("Jenis surat wajib");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit" : "Buat"} Surat Keluar</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Kode Surat *</Label>
              <Select value={form.kode_surat ?? ""} onValueChange={onKodeChange}>
                <SelectTrigger><SelectValue placeholder="Pilih kode surat" /></SelectTrigger>
                <SelectContent>
                  {kodeList.map((k) => <SelectItem key={k.id} value={k.kode}>{k.kode} — {k.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tanggal Surat *</Label>
              <Input type="date" value={form.tanggal_surat ?? ""} onChange={(e) => setForm({ ...form, tanggal_surat: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nomor Surat</Label>
            <Input
              value={form.nomor_surat || nomorPreview}
              onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })}
              placeholder={form.kode_surat ? nomorPreview : "Pilih kode surat terlebih dahulu"}
              disabled={!form.kode_surat}
            />
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full mt-2">
                  <Lock className="h-4 w-4 mr-2" /> Pilih Nomor Surat Tersedia ({reservedCount})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Pilih Nomor Diamankan</DialogTitle></DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-1">
                  {reserved.filter((r) => r.status === "tersedia").map((r) => (
                    <button
                      key={r.id}
                      className="w-full flex items-center justify-between p-3 rounded border hover:bg-muted/40 text-left"
                      onClick={() => {
                        setForm((f: any) => ({ ...f, kode_surat: r.kode_surat, nomor_urut: r.nomor_urut, reserved_id: r.id }));
                        setPickerOpen(false);
                      }}
                    >
                      <div>
                        <div className="font-semibold">{r.kode_surat} — Nomor {r.nomor_urut}</div>
                        <div className="text-xs text-muted-foreground">Diamankan {fmtDate(r.tanggal_diamankan)}</div>
                      </div>
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Tersedia</Badge>
                    </button>
                  ))}
                  {reserved.filter((r) => r.status === "tersedia").length === 0 && (
                    <div className="p-6 text-center text-sm text-muted-foreground">Belum ada nomor tersedia.</div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            <Label>Tujuan *</Label>
            <Input value={form.tujuan ?? ""} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} placeholder="Masukkan tujuan surat" />
          </div>
          <div className="space-y-1">
            <Label>Perihal *</Label>
            <Input value={form.perihal ?? ""} onChange={(e) => setForm({ ...form, perihal: e.target.value })} placeholder="Masukkan perihal surat" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Jenis Surat *</Label>
              <Select value={form.jenis_surat ?? ""} onValueChange={(v) => setForm({ ...form, jenis_surat: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis surat" /></SelectTrigger>
                <SelectContent>{JENIS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sifat Surat *</Label>
              <Select value={form.sifat_surat ?? "Biasa"} onValueChange={(v) => setForm({ ...form, sifat_surat: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SIFAT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Ringkasan Isi</Label>
            <Textarea rows={3} value={form.isi_ringkas ?? ""} onChange={(e) => setForm({ ...form, isi_ringkas: e.target.value })} placeholder="Ringkasan isi surat (opsional)" />
          </div>

          <div className="space-y-1">
            <Label>Upload Dokumen</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {form.file_url && !file && (
              <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Lihat dokumen saat ini</a>
            )}
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status ?? "draft"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
