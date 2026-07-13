import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Eye, Pencil, Trash2, Search, Download, FileSpreadsheet, MapPin,
  Users, ArrowUpDown, ArrowUp, ArrowDown, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import {
  listSuratTugas, saveSuratTugas, deleteSuratTugas, listGuruLite,
} from "@/lib/surat-tugas.functions";
import { listNomor } from "@/lib/persuratan.functions";
import { nextNomorUrut } from "@/lib/surat-keluar.functions";
import { downloadSuratTugasPdf } from "@/lib/surat-tugas-pdf";
import { downloadLaporanSppdPdf } from "@/lib/laporan-sppd-pdf";
import { downloadSppdPdf } from "@/lib/sppd-pdf";
import { downloadSuratTugasBundlePdf } from "@/lib/surat-tugas-bundle-pdf";

export const Route = createFileRoute("/_authenticated/persuratan/surat-tugas")({
  head: () => ({ meta: [{ title: "Surat Tugas & SPPD — SUPREME XPOES" }] }),
  component: Page,
});

const STATUS_OPTIONS = ["draft", "aktif", "arsip"] as const;

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRange(a?: string | null, b?: string | null) {
  if (!a && !b) return "—";
  const fa = fmtDate(a);
  const fb = fmtDate(b);
  if (!b || a === b) return fa;
  return `${fa} – ${fb}`;
}

function statusBadge(s?: string | null) {
  const v = (s ?? "aktif").toLowerCase();
  if (v === "aktif") return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0">Aktif</Badge>;
  if (v === "draft") return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Draft</Badge>;
  return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{v}</Badge>;
}

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

function SortTh({
  label, field, sort, setSort,
}: {
  label: string; field: string;
  sort: { key: string; dir: "asc" | "desc" } | null;
  setSort: (s: { key: string; dir: "asc" | "desc" } | null) => void;
}) {
  const active = sort?.key === field;
  const icon = active
    ? (sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
    : <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return (
    <th
      className="text-left p-3 whitespace-nowrap cursor-pointer select-none hover:bg-muted transition-colors"
      onClick={() => {
        if (active && sort.dir === "desc") setSort(null);
        else setSort({ key: field, dir: active ? "desc" : "asc" });
      }}
    >
      <div className="flex items-center gap-1">{label}{icon}</div>
    </th>
  );
}

function Page() {
  const qc = useQueryClient();
  const fnList = useServerFn(listSuratTugas);
  const fnDel = useServerFn(deleteSuratTugas);
  const fnNomor = useServerFn(listNomor);

  const { data: rows } = useSuspenseQuery({ queryKey: ["surat-tugas"], queryFn: () => fnList() });
  const { data: nomorList = [] } = useQuery({ queryKey: ["persuratan-nomor"], queryFn: () => fnNomor() });

  const formatNomor = useMemo(() => {
    const row = (nomorList as any[]).find(
      (n) => n.jenis_surat === "surat_keluar" && n.is_active !== false,
    ) ?? (nomorList as any[]).find((n) => n.jenis_surat === "surat_keluar");
    return row?.format_nomor ?? "{KODE}/{NOMOR}/SMKN1.PN-CADISDIK.WIL.IV/{TAHUN}";
  }, [nomorList]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>({ key: "tanggal_mulai", dir: "desc" });
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [page, setPage] = useState(1);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => { setPage(1); }, [q, status, pageSize]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r: any) => {
      if (status !== "all" && (r.status ?? "aktif").toLowerCase() !== status) return false;
      if (!s) return true;
      return `${r.nomor_surat ?? ""} ${r.tujuan_lokasi ?? ""} ${r.keperluan ?? ""}`.toLowerCase().includes(s);
    });
  }, [rows, q, status]);

  const sortedFiltered = useMemo(() => {
    if (!sort?.key) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    const key = sort.key;
    return [...filtered].sort((a: any, b: any) => {
      let av = a[key];
      let bv = b[key];
      if (key === "tanggal_mulai") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av ?? "").toLowerCase();
        bv = String(bv ?? "").toLowerCase();
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sort]);

  const size = pageSize === "all" ? Math.max(1, sortedFiltered.length) : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageRows = pageSize === "all" ? sortedFiltered : sortedFiltered.slice((currentPage - 1) * size, currentPage * size);

  const del = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => {
      toast.success("Surat tugas dihapus");
      qc.invalidateQueries({ queryKey: ["surat-tugas"] });
      qc.invalidateQueries({ queryKey: ["surat-keluar"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportExcel = () => {
    const header = ["No. Surat", "Tujuan", "Tanggal Mulai", "Tanggal Selesai", "Keperluan", "Peserta", "Status"];
    const body = sortedFiltered.map((r: any) => [
      r.nomor_surat ?? "",
      r.tujuan_lokasi ?? "",
      r.tanggal_mulai ?? "",
      r.tanggal_selesai ?? "",
      r.keperluan ?? "",
      (r.peserta ?? []).map((p: any) => p.nama_peserta).join(", "),
      r.status ?? "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = [{ wch: 36 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 40 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Surat Tugas");
    XLSX.writeFile(wb, `surat-tugas.xlsx`);
  };

  const openCreate = () => { setEditing(null); setOpenForm(true); };
  const openEdit = (r: any) => { setEditing(r); setOpenForm(true); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Surat Tugas & SPPD</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola surat tugas dan SPPD</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Daftar Surat Tugas & SPPD</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Ekspor Excel
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Buat Surat Tugas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nomor surat, lokasi, atau keperluan..."
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <SortTh label="No. Surat" field="nomor_surat" sort={sort} setSort={setSort} />
                  <SortTh label="Tujuan" field="tujuan_lokasi" sort={sort} setSort={setSort} />
                  <SortTh label="Tanggal" field="tanggal_mulai" sort={sort} setSort={setSort} />
                  <SortTh label="Status" field="status" sort={sort} setSort={setSort} />
                  <th className="text-right p-3 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r: any) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{r.nomor_surat ?? "—"}</td>
                    <td className="p-3 max-w-xs">
                      <div className="line-clamp-1">{r.tujuan_lokasi ?? "—"}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtRange(r.tanggal_mulai, r.tanggal_selesai)}</td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Lihat">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Download PDF">
                              <Download className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Download PDF</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={async () => {
                                await downloadSuratTugasPdf(r);
                                await downloadSppdPdf(r);
                                await downloadLaporanSppdPdf(r);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Semua (3 Dokumen)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => downloadSuratTugasPdf(r)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Surat Tugas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadSppdPdf(r)}>
                              <FileText className="h-4 w-4 mr-2" />
                              SPPD
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadLaporanSppdPdf(r)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Laporan SPPD
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" title="SPPD">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm("Hapus surat tugas? Surat keluar terkait juga akan dihapus.")) del.mutate(r.id); }}
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Tidak ada data.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(v === "all" ? "all" : Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  <SelectItem value="all">Semua</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">dari {sortedFiltered.length} data</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const n = i + 1;
                return (
                  <Button key={n} variant={currentPage === n ? "default" : "outline"} size="sm" onClick={() => setPage(n)}>{n}</Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Selanjutnya <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SuratTugasFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        editing={editing}
        formatNomor={formatNomor}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["surat-tugas"] });
          qc.invalidateQueries({ queryKey: ["surat-keluar"] });
        }}
      />
    </div>
  );
}

function SuratTugasFormDialog({
  open, onOpenChange, editing, formatNomor, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: any | null;
  formatNomor: string;
  onSaved: () => void;
}) {
  const fnGuru = useServerFn(listGuruLite);
  const fnSave = useServerFn(saveSuratTugas);
  const fnNext = useServerFn(nextNomorUrut);
  const { data: guruList = [] } = useQuery({ queryKey: ["guru-lite"], queryFn: () => fnGuru(), enabled: open });

  const [tanggalSurat, setTanggalSurat] = useState("");
  const [nomorUrut, setNomorUrut] = useState<number | "">("");
  const [kodeKegiatan, setKodeKegiatan] = useState("");
  const [kodeRing, setKodeRing] = useState("");
  const [dasarAda, setDasarAda] = useState<"ada" | "tidak">("tidak");
  const [nomorDasar, setNomorDasar] = useState("");
  const [tanggalDasar, setTanggalDasar] = useState("");
  const [perihalDasar, setPerihalDasar] = useState("");
  const [instansiDasar, setInstansiDasar] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [waktuBerangkat, setWaktuBerangkat] = useState("08:00");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [kendaraan, setKendaraan] = useState("Roda 4");
  const [status, setStatus] = useState("aktif");
  const [tujuan, setTujuan] = useState<Array<{ nama: string; kabupaten: string; alamat: string }>>([
    { nama: "", kabupaten: "", alamat: "" },
  ]);
  const [peserta, setPeserta] = useState<Array<{ guru_id?: string; nama_peserta: string; nip: string; jabatan: string; pangkat_golongan: string }>>([
    { nama_peserta: "", nip: "", jabatan: "", pangkat_golongan: "" },
  ]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTanggalSurat(editing.tanggal_mulai ?? new Date().toISOString().slice(0, 10));
      setNomorUrut(Number(String(editing.nomor_surat ?? "").split("/")[1]) || "");
      setKodeKegiatan(editing.kode_kegiatan ?? "");
      setKodeRing(editing.kode_ring ?? "");
      setDasarAda(editing.dasar_surat_ada ? "ada" : "tidak");
      setNomorDasar(editing.nomor_dasar_surat ?? "");
      setTanggalDasar(editing.tanggal_dasar_surat ?? "");
      setPerihalDasar(editing.perihal_dasar_surat ?? "");
      setInstansiDasar(editing.instansi_dasar_surat ?? "");
      setKeperluan(editing.keperluan ?? "");
      setWaktuBerangkat(editing.waktu_berangkat ?? "08:00");
      setTanggalMulai(editing.tanggal_mulai ?? "");
      setTanggalSelesai(editing.tanggal_selesai ?? "");
      setKendaraan(editing.kendaraan ?? "Roda 4");
      setStatus(editing.status ?? "aktif");
      const parts = String(editing.tujuan_lokasi ?? "").split(" | ").filter(Boolean);
      setTujuan(parts.length ? parts.map((p) => {
        const [nama, kabupaten] = p.split(", ");
        return { nama: nama ?? "", kabupaten: kabupaten ?? "", alamat: "" };
      }) : [{ nama: "", kabupaten: "", alamat: "" }]);
      const ps = (editing.peserta ?? []).map((p: any) => ({
        nama_peserta: p.nama_peserta ?? "", nip: p.nip ?? "",
        jabatan: p.jabatan ?? "", pangkat_golongan: p.pangkat_golongan ?? "",
      }));
      setPeserta(ps.length ? ps : [{ nama_peserta: "", nip: "", jabatan: "", pangkat_golongan: "" }]);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setTanggalSurat(today);
      setNomorUrut("");
      setKodeKegiatan(""); setKodeRing("");
      setDasarAda("tidak"); setNomorDasar(""); setTanggalDasar(""); setPerihalDasar(""); setInstansiDasar("");
      setKeperluan(""); setWaktuBerangkat("08:00");
      setTanggalMulai(today); setTanggalSelesai(today);
      setKendaraan("Roda 4"); setStatus("aktif");
      setTujuan([{ nama: "", kabupaten: "", alamat: "" }]);
      setPeserta([{ nama_peserta: "", nip: "", jabatan: "", pangkat_golongan: "" }]);
      // auto next nomor urut
      fnNext({ data: { kode_surat: "805" } })
        .then((r: any) => setNomorUrut(r.next))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const nomorPreview = useMemo(() => {
    if (!nomorUrut) return "";
    const year = tanggalSurat ? new Date(tanggalSurat).getFullYear() : new Date().getFullYear();
    return applyFormatNomor(formatNomor, "805", nomorUrut, year);
  }, [nomorUrut, tanggalSurat, formatNomor]);

  const lamaHari = useMemo(() => {
    if (!tanggalMulai || !tanggalSelesai) return 0;
    const a = new Date(tanggalMulai).getTime();
    const b = new Date(tanggalSelesai).getTime();
    if (isNaN(a) || isNaN(b) || b < a) return 0;
    return Math.floor((b - a) / 86400000) + 1;
  }, [tanggalMulai, tanggalSelesai]);

  const setPesertaFromGuru = (idx: number, guruId: string) => {
    const g: any = (guruList as any[]).find((x) => x.id === guruId);
    if (!g) return;
    setPeserta((prev) => prev.map((p, i) => i === idx ? {
      ...p, guru_id: guruId, nama_peserta: g.nama ?? "", nip: g.nip ?? "",
      pangkat_golongan: g.pangkat_golongan ?? "",
    } : p));
  };

  const save = useMutation({
    mutationFn: () => fnSave({
      data: {
        id: editing?.id,
        surat_keluar_id: editing?.surat_keluar_id ?? null,
        kode_surat: "805",
        nomor_urut: Number(nomorUrut),
        nomor_surat: nomorPreview,
        tanggal_surat: tanggalSurat,
        kode_kegiatan: kodeKegiatan || null,
        kode_ring: kodeRing || null,
        dasar_surat_ada: dasarAda === "ada",
        nomor_dasar_surat: nomorDasar || null,
        tanggal_dasar_surat: tanggalDasar || null,
        perihal_dasar_surat: perihalDasar || null,
        instansi_dasar_surat: instansiDasar || null,
        keperluan,
        waktu_berangkat: waktuBerangkat || null,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        kendaraan,
        status,
        tujuan_list: tujuan.filter((t) => t.nama.trim()),
        peserta: peserta.filter((p) => p.nama_peserta.trim()),
      },
    }),
    onSuccess: () => { toast.success("Surat tugas disimpan"); onOpenChange(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!nomorUrut) return toast.error("Nomor urut wajib");
    if (!tanggalSurat) return toast.error("Tanggal surat wajib");
    if (!keperluan.trim()) return toast.error("Keperluan wajib");
    if (!tujuan[0]?.nama?.trim()) return toast.error("Nama tujuan wajib");
    if (!peserta[0]?.nama_peserta?.trim()) return toast.error("Peserta utama wajib");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Surat Tugas" : "Buat Surat Tugas"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Kode Surat</Label>
              <Input value="805 - SPPD / Surat Tugas" disabled />
            </div>
            <div className="space-y-1">
              <Label>Tanggal Surat</Label>
              <Input type="date" value={tanggalSurat} onChange={(e) => setTanggalSurat(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nomor Surat</Label>
              <Input value={nomorPreview || "Auto-generate saat simpan"} disabled />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Kode Kegiatan <span className="text-muted-foreground">(opsional)</span></Label>
              <Input value={kodeKegiatan} onChange={(e) => setKodeKegiatan(e.target.value)} placeholder="Masukkan kode kegiatan" />
            </div>
            <div className="space-y-1">
              <Label>Kode Ring <span className="text-muted-foreground">(opsional)</span></Label>
              <Input value={kodeRing} onChange={(e) => setKodeRing(e.target.value)} placeholder="Masukkan kode ring" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label>Dasar Surat</Label>
            <Select value={dasarAda} onValueChange={(v: any) => setDasarAda(v)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tidak">Tidak Ada</SelectItem>
                <SelectItem value="ada">Ada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dasarAda === "ada" && (
            <div className="grid gap-3 md:grid-cols-2 border rounded-md p-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Nomor Dasar Surat</Label>
                <Input value={nomorDasar} onChange={(e) => setNomorDasar(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tanggal Dasar Surat</Label>
                <Input type="date" value={tanggalDasar} onChange={(e) => setTanggalDasar(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Instansi</Label>
                <Input value={instansiDasar} onChange={(e) => setInstansiDasar(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Perihal</Label>
                <Input value={perihalDasar} onChange={(e) => setPerihalDasar(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Peserta (Maks. 3)</Label>
              <Button type="button" variant="outline" size="sm" disabled={peserta.length >= 3}
                onClick={() => setPeserta((p) => [...p, { nama_peserta: "", nip: "", jabatan: "", pangkat_golongan: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Pengikut
              </Button>
            </div>
            <div className="space-y-3">
              {peserta.map((p, i) => (
                <div key={i} className="border rounded-md p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={i === 0 ? "bg-blue-600 text-white border-0" : "bg-slate-100 text-slate-700 border-slate-200"} variant={i === 0 ? "default" : "outline"}>
                      {i === 0 ? "Peserta Utama" : `Pengikut ${i}`}
                    </Badge>
                    {i > 0 && (
                      <Button size="icon" variant="ghost" onClick={() => setPeserta((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Peserta *</Label>
                      <Select value={p.guru_id ?? ""} onValueChange={(v) => setPesertaFromGuru(i, v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih dari database guru" /></SelectTrigger>
                        <SelectContent>
                          {(guruList as any[]).map((g) => (
                            <SelectItem key={g.id} value={g.id}>{g.nama}{g.nip ? ` — ${g.nip}` : ""}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {p.nama_peserta && <div className="text-xs text-muted-foreground">{p.nama_peserta}</div>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">NIP</Label>
                      <Input value={p.nip} placeholder="Otomatis" disabled />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pangkat / Golongan</Label>
                      <Input value={p.pangkat_golongan} placeholder="Otomatis dari referensi TPG" disabled />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Jabatan</Label>
                      <Input
                        value={p.jabatan}
                        onChange={(e) => setPeserta((prev) => prev.map((pp, idx) => idx === i ? { ...pp, jabatan: e.target.value } : pp))}
                        placeholder="Masukkan jabatan"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Keperluan Kegiatan *</Label>
            <Textarea rows={3} value={keperluan} onChange={(e) => setKeperluan(e.target.value)} placeholder="Masukkan keperluan tugas" />
          </div>

          <div className="space-y-1">
            <Label>Waktu Berangkat (Pukul)</Label>
            <Input type="time" value={waktuBerangkat} onChange={(e) => setWaktuBerangkat(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Tempat Tujuan</Label>
              <Button type="button" variant="outline" size="sm" disabled={tujuan.length >= 2}
                onClick={() => setTujuan((t) => [...t, { nama: "", kabupaten: "", alamat: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Tujuan 2
              </Button>
            </div>
            <div className="space-y-3">
              {tujuan.map((t, i) => (
                <div key={i} className="border rounded-md p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-slate-200">{`Tujuan ${i + 1}${i === 0 ? " (Wajib)" : ""}`}</Badge>
                    {i > 0 && (
                      <Button size="icon" variant="ghost" onClick={() => setTujuan((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nama Tujuan *</Label>
                      <Input value={t.nama} placeholder="Nama tempat tujuan"
                        onChange={(e) => setTujuan((prev) => prev.map((tt, idx) => idx === i ? { ...tt, nama: e.target.value } : tt))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Kabupaten / Kota</Label>
                      <Input value={t.kabupaten} placeholder="Kabupaten/Kota"
                        onChange={(e) => setTujuan((prev) => prev.map((tt, idx) => idx === i ? { ...tt, kabupaten: e.target.value } : tt))} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Alamat</Label>
                      <Input value={t.alamat} placeholder="Alamat lengkap"
                        onChange={(e) => setTujuan((prev) => prev.map((tt, idx) => idx === i ? { ...tt, alamat: e.target.value } : tt))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tanggal Mulai Tugas *</Label>
              <Input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tanggal Selesai Tugas *</Label>
              <Input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Lamanya Perjalanan</Label>
              <Input value={`${lamaHari} hari`} disabled />
            </div>
            <div className="space-y-1">
              <Label>Kendaraan</Label>
              <Select value={kendaraan} onValueChange={setKendaraan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Roda 2">Roda 2</SelectItem>
                  <SelectItem value="Roda 4">Roda 4</SelectItem>
                  <SelectItem value="Umum">Kendaraan Umum</SelectItem>
                  <SelectItem value="Pesawat">Pesawat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
