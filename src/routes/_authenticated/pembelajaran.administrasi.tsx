import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { withDateSuffix } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, CalendarClock, Users, FileCheck2, FileX2, CheckCircle2, TrendingUp,
  Hourglass, AlertTriangle, FileClock, Pencil, ChevronLeft, ChevronRight,
  ArrowUpDown, ExternalLink, Download, Upload, Loader2, X, RotateCcw, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  getAdministrasiRefs, listAdministrasi, upsertAdministrasi, getBerkasSignedUrl,
  resetAdministrasi,
} from "@/lib/administrasi-pembelajaran.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/pembelajaran/administrasi")({
  head: () => ({ meta: [{ title: "Administrasi Pembelajaran — SUPREME XPOES" }] }),
  component: AdministrasiPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal: {error.message}</div>,
});

type Ket = "belum" | "menunggu" | "valid" | "perbaikan";
type SortKey =
  | "no_asc" | "no_desc"
  | "rombel_asc" | "rombel_desc"
  | "mapel_asc" | "mapel_desc"
  | "guru_asc" | "guru_desc"
  | "kelengkapan_asc" | "kelengkapan_desc"
  | "keterangan_asc" | "keterangan_desc";

type DocKey = "analisis_cp_atp_link" | "prota_link" | "promes_link" | "rpa_link" | "modul_ajar_link";

const DOC_LABELS: Record<DocKey, string> = {
  analisis_cp_atp_link: "Analisis CP & ATP",
  prota_link: "Program Tahunan",
  promes_link: "Program Semester",
  rpa_link: "RPA",
  modul_ajar_link: "Modul Ajar / PP",
};
const DOC_SHORT: Record<DocKey, string> = {
  analisis_cp_atp_link: "Analisis CP & ATP",
  prota_link: "Prota",
  promes_link: "Promes",
  rpa_link: "RPA",
  modul_ajar_link: "Modul Ajar / PP",
};
const DOC_KEYS: DocKey[] = ["analisis_cp_atp_link", "prota_link", "promes_link", "rpa_link", "modul_ajar_link"];

function AdministrasiPage() {
  const qc = useQueryClient();
  const refsFn = useServerFn(getAdministrasiRefs);
  const listFn = useServerFn(listAdministrasi);
  const upsertFn = useServerFn(upsertAdministrasi);
  const resetFn = useServerFn(resetAdministrasi);

  const [rombelId, setRombelId] = useState("all");
  const [mapelId, setMapelId] = useState("all");
  const [guruId, setGuruId] = useState("all");
  const [keterangan, setKeterangan] = useState<"all" | Ket>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortKey>("rombel_asc");
  const [editRow, setEditRow] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmReset, setConfirmReset] = useState<
    | { kind: "single"; ids: string[]; label: string }
    | { kind: "bulk"; ids: string[] }
    | { kind: "guru"; ids: string[]; guruName: string }
    | null
  >(null);

  const { data: refs } = useQuery({
    queryKey: ["administrasi-refs"],
    queryFn: () => refsFn(),
  });

  const { data: list, isFetching } = useQuery({
    queryKey: ["administrasi", { rombelId, mapelId, guruId, keterangan, page, pageSize, sort }],
    queryFn: () => listFn({ data: { rombel_id: rombelId, mapel_id: mapelId, guru_id: guruId, keterangan, page, pageSize, sort } }),
  });

  const upsertM = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => {
      toast.success("Berkas disimpan");
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ["administrasi"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetM = useMutation({
    mutationFn: (ids: string[]) => resetFn({ data: { rombel_mata_pelajaran_ids: ids } }),
    onSuccess: (r: any) => {
      toast.success(`Berhasil mereset ${r?.reset ?? 0} data (${r?.files_removed ?? 0} berkas dihapus)`);
      setSelectedIds(new Set());
      setConfirmReset(null);
      qc.invalidateQueries({ queryKey: ["administrasi"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isAdmin = Boolean((refs as any)?.is_admin);
  const uploadEnabled = (refs as any)?.upload_enabled !== false;
  const canEdit = isAdmin || uploadEnabled;
  const total = list?.total ?? 0;
  const stats = list?.stats;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const deadlineText = useMemo(() => {
    if (!refs?.deadline) return "";
    const d = new Date(refs.deadline);
    if (isNaN(d.getTime())) return "";
    const formatted = d.toLocaleString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).replace(/\./g, ":");
    return `${formatted} WIB`;
  }, [refs?.deadline]);

  const sortIcon = (col: "rombel" | "mapel" | "guru" | "kelengkapan" | "keterangan") => (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() =>
        setSort(sort === `${col}_asc` ? `${col}_desc` as SortKey : `${col}_asc` as SortKey)
      }
    >
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const progressPct = stats && stats.total > 0
    ? Math.round((stats.sudah_input / stats.total) * 100)
    : 0;

  const exportExcel = () => {
    const rows = (list?.rows ?? []).map((r: any, i: number) => ({
      No: (page - 1) * pageSize + i + 1,
      Rombel: r.rombel_name,
      "Mata Pelajaran": r.mapel_nama,
      "Guru Pengampu": r.guru_nama,
      "Analisis CP & ATP": r.analisis_cp_atp_link ?? "",
      "Program Tahunan": r.prota_link ?? "",
      "Program Semester": r.promes_link ?? "",
      RPA: r.rpa_link ?? "",
      "Modul Ajar / PP": r.modul_ajar_link ?? "",
      "Kelengkapan (%)": r.kelengkapan,
      Keterangan: labelKet(r.keterangan),
      "Diperiksa Oleh": r.diperiksa_oleh_nama ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Administrasi");
    XLSX.writeFile(wb, withDateSuffix("administrasi-pembelajaran.xlsx"));
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Administrasi Pembelajaran</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Input berkas pembelajaran (Analisis CP &amp; ATP, Prota, Promes, RPA, Modul Ajar / PP)
          </p>
        </div>
      </div>

      {refs?.deadline && (
        <DeadlineCountdown deadline={refs.deadline} deadlineText={deadlineText} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Total Data" value={stats?.total ?? 0} tint="blue" />
        <StatCard icon={<FileCheck2 className="h-4 w-4 text-blue-600" />} label="Sudah Input" value={stats?.sudah_input ?? 0}
          suffix={pctSuffix(stats?.sudah_input, stats?.total)} tint="blue" />
        <StatCard icon={<FileX2 className="h-4 w-4 text-muted-foreground" />} label="Belum Input" value={stats?.belum_input ?? 0}
          suffix={pctSuffix(stats?.belum_input, stats?.total)} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Valid" value={stats?.valid ?? 0}
          suffix={pctSuffix(stats?.valid, stats?.total)} tint="emerald" />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Lengkap 100%" value={stats?.lengkap_100 ?? 0}
          suffix={pctSuffix(stats?.lengkap_100, stats?.total)} tint="emerald" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Hourglass className="h-4 w-4 text-amber-600" />} label="Menunggu Validasi" value={stats?.menunggu ?? 0} tint="amber" />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} label="Butuh Perbaikan" value={stats?.perbaikan ?? 0} tint="rose" />
        <StatCard icon={<FileClock className="h-4 w-4 text-amber-600" />} label="Berkas Parsial" value={stats?.parsial ?? 0} tint="amber" />
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Progress Keseluruhan</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={progressPct} className="h-2 flex-1" />
              <span className="text-sm font-semibold">{progressPct}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
          <div className="font-medium">Fitur pelaporan sedang dinonaktifkan</div>
          <p className="text-xs mt-1">
            Admin telah mematikan fitur upload administrasi pembelajaran. Anda tidak dapat
            menyimpan atau mengunggah berkas untuk sementara waktu. Silakan hubungi admin.
          </p>
        </div>
      )}


      <Card className="bg-muted/40">
        <CardContent className="p-4 text-sm space-y-2">
          <div className="font-medium">Cara Input Berkas</div>
          <p className="text-xs text-muted-foreground">
            Anda dapat <span className="font-medium">mengunggah file langsung</span> (PDF/DOCX/XLSX, maks 25 MB)
            atau memasukkan <span className="font-medium">link</span> dari Google Drive / layanan penyimpanan lainnya.
          </p>
          <div className="text-xs">
            <div className="font-medium mt-2">Jika Menggunakan Google Drive:</div>
            <p className="text-muted-foreground">
              Pastikan file diatur agar dapat diakses publik (Anyone with the link can view).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-sm sm:text-base">Daftar Berkas Pembelajaran</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && guruId !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                  onClick={() => {
                    const ids = (list?.rows ?? []).map((r: any) => r.id);
                    if (ids.length === 0) { toast.info("Tidak ada data untuk direset"); return; }
                    const g = (refs?.guru ?? []).find((x: any) => x.id === guruId);
                    setConfirmReset({ kind: "guru", ids, guruName: g?.nama ?? "guru terpilih" });
                  }}
                >
                  <RotateCcw className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Reset Guru Ini</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <Download className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Export Excel</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
            <Select value={rombelId} onValueChange={(v) => { setPage(1); setRombelId(v); }}>
              <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Filter Rombel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rombel</SelectItem>
                {(refs?.rombel ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={guruId} onValueChange={(v) => { setPage(1); setGuruId(v); }}>
              <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Filter Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Guru</SelectItem>
                {(refs?.guru ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mapelId} onValueChange={(v) => { setPage(1); setMapelId(v); }}>
              <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Filter Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {(refs?.mapel ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={keterangan} onValueChange={(v) => { setPage(1); setKeterangan(v as any); }}>
              <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Filter Keterangan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Keterangan</SelectItem>
                <SelectItem value="belum">Belum Menginput</SelectItem>
                <SelectItem value="menunggu">Menunggu Validasi</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="perbaikan">Butuh Perbaikan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / halaman</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          {isAdmin && selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
              <div className="text-sm text-rose-800">
                <span className="font-semibold">{selectedIds.size}</span> data terpilih
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Bersihkan</Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmReset({ kind: "bulk", ids: Array.from(selectedIds) })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />Reset Terpilih
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Menampilkan {(list?.rows ?? []).length === 0 ? 0 : (page - 1) * pageSize + 1}
            –{(page - 1) * pageSize + (list?.rows ?? []).length} dari {total} data
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {isAdmin && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          (list?.rows ?? []).length > 0 &&
                          (list?.rows ?? []).every((r: any) => selectedIds.has(r.id))
                        }
                        onCheckedChange={(v) => {
                          const next = new Set(selectedIds);
                          const rows = list?.rows ?? [];
                          if (v) rows.forEach((r: any) => next.add(r.id));
                          else rows.forEach((r: any) => next.delete(r.id));
                          setSelectedIds(next);
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Rombel {sortIcon("rombel")}</TableHead>
                  <TableHead>Mata Pelajaran {sortIcon("mapel")}</TableHead>
                  <TableHead>Guru Pengampu {sortIcon("guru")}</TableHead>
                  {DOC_KEYS.map((k) => (
                    <TableHead key={k} className="text-center whitespace-nowrap">{DOC_SHORT[k]}</TableHead>
                  ))}
                  <TableHead>Kelengkapan {sortIcon("kelengkapan")}</TableHead>
                  <TableHead>Keterangan {sortIcon("keterangan")}</TableHead>
                  <TableHead>Diperiksa Oleh</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching && (list?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 14 : 13} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
                )}
                {!isFetching && (list?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 14 : 13} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
                )}
                {(list?.rows ?? []).map((r: any, idx: number) => (
                  <TableRow key={r.id} data-state={selectedIds.has(r.id) ? "selected" : undefined}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={(v) => {
                            const next = new Set(selectedIds);
                            if (v) next.add(r.id); else next.delete(r.id);
                            setSelectedIds(next);
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.rombel_name}</TableCell>
                    <TableCell className="text-sm">{r.mapel_nama}</TableCell>
                    <TableCell className="text-sm">{r.guru_nama}</TableCell>
                    {DOC_KEYS.map((k) => <LinkCell key={k} value={r[k]} />)}
                    <TableCell>
                      <div className="flex items-center gap-2 w-[110px]">
                        <Progress value={r.kelengkapan} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-9 text-right">{r.kelengkapan}%</span>
                      </div>
                    </TableCell>
                    <TableCell><KetBadge ket={r.keterangan} /></TableCell>
                    <TableCell className="text-xs">
                      {r.diperiksa_oleh_nama ? (
                        <div>
                          <div>{r.diperiksa_oleh_nama}</div>
                          {r.diperiksa_at && (
                            <div className="text-muted-foreground">
                              {new Date(r.diperiksa_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setEditRow(r)}
                          title={canEdit ? "Edit" : "Fitur pelaporan sedang dinonaktifkan oleh admin"}
                          disabled={!canEdit}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAdmin && r.kelengkapan > 0 && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Reset isian"
                            onClick={() => setConfirmReset({
                              kind: "single",
                              ids: [r.id],
                              label: `${r.rombel_name} • ${r.mapel_nama} • ${r.guru_nama}`,
                            })}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>


          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditDialog
        row={editRow}
        onOpenChange={(o) => { if (!o) setEditRow(null); }}
        onSubmit={(v) => upsertM.mutate(v)}
        loading={upsertM.isPending}
      />

      <AlertDialog open={!!confirmReset} onOpenChange={(o) => { if (!o) setConfirmReset(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Isian Administrasi Pembelajaran?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Tindakan ini akan <span className="font-semibold text-rose-700">menghapus semua berkas yang diinput</span>
                  {" "}(link maupun file terunggah) dan mereset kelengkapan menjadi <span className="font-semibold">0%</span>.
                  Tindakan ini <span className="font-semibold">tidak dapat dibatalkan</span>.
                </p>
                {confirmReset?.kind === "single" && (
                  <p className="rounded-md bg-muted p-2 text-xs">{confirmReset.label}</p>
                )}
                {confirmReset?.kind === "guru" && (
                  <p className="rounded-md bg-muted p-2 text-xs">
                    Semua isian milik <span className="font-semibold">{confirmReset.guruName}</span> yang tampil pada filter saat ini
                    ({confirmReset.ids.length} data) akan direset.
                  </p>
                )}
                {confirmReset?.kind === "bulk" && (
                  <p className="rounded-md bg-muted p-2 text-xs">
                    <span className="font-semibold">{confirmReset.ids.length}</span> data terpilih akan direset.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetM.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={resetM.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmReset) resetM.mutate(confirmReset.ids);
              }}
            >
              {resetM.isPending ? "Mereset…" : "Ya, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function pctSuffix(v: number | undefined, total: number | undefined) {
  if (!v || !total) return undefined;
  return `(${Math.round((v / total) * 100)}%)`;
}

function StatCard({ icon, label, value, suffix, tint }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tint?: "blue" | "emerald" | "amber" | "rose";
}) {
  const tintClass = tint === "blue" ? "text-blue-600"
    : tint === "emerald" ? "text-emerald-600"
    : tint === "amber" ? "text-amber-600"
    : tint === "rose" ? "text-rose-600"
    : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold ${tintClass}`}>{value}</span>
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkCell({ value }: { value: string | null }) {
  const signFn = useServerFn(getBerkasSignedUrl);
  const [loading, setLoading] = useState(false);
  if (!value) return <TableCell className="text-center text-muted-foreground">-</TableCell>;

  const isStorage = value.startsWith("storage://");
  const open = async () => {
    if (!isStorage) { window.open(value, "_blank", "noopener"); return; }
    setLoading(true);
    try {
      const path = value.replace(/^storage:\/\//, "");
      const res = await signFn({ data: { path } });
      if (res.url) window.open(res.url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuka berkas");
    } finally { setLoading(false); }
  };

  return (
    <TableCell className="text-center">
      <button type="button" onClick={open}
        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
        Lihat
      </button>
    </TableCell>
  );
}

function labelKet(k: Ket) {
  return k === "valid" ? "Valid"
    : k === "menunggu" ? "Menunggu Validasi"
    : k === "perbaikan" ? "Butuh Perbaikan"
    : "Belum Menginput";
}

function KetBadge({ ket }: { ket: Ket }) {
  const cls =
    ket === "valid" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : ket === "menunggu" ? "bg-amber-50 text-amber-700 border-amber-200"
    : ket === "perbaikan" ? "bg-rose-50 text-rose-700 border-rose-200"
    : "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={`${cls} font-normal`}>{labelKet(ket)}</Badge>;
}

// ================ Edit Dialog ================
function EditDialog({ row, onOpenChange, onSubmit, loading }: {
  row: any | null;
  onOpenChange: (o: boolean) => void;
  onSubmit: (v: any) => void;
  loading: boolean;
}) {
  const [values, setValues] = useState<Record<DocKey, string>>({
    analisis_cp_atp_link: "", prota_link: "", promes_link: "", rpa_link: "", modul_ajar_link: "",
  });

  const open = !!row;
  useEffect(() => {
    if (row) {
      setValues({
        analisis_cp_atp_link: row.analisis_cp_atp_link ?? "",
        prota_link: row.prota_link ?? "",
        promes_link: row.promes_link ?? "",
        rpa_link: row.rpa_link ?? "",
        modul_ajar_link: row.modul_ajar_link ?? "",
      });
    }
  }, [row?.id]);

  const setField = (k: DocKey, v: string) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Input Berkas Pembelajaran</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded-md p-3">
              <div><span className="text-muted-foreground">Rombel: </span>{row.rombel_name}</div>
              <div><span className="text-muted-foreground">Mapel: </span>{row.mapel_nama}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Guru: </span>{row.guru_nama}</div>
            </div>
            {row.catatan_perbaikan && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                <div className="font-medium">Catatan Perbaikan</div>
                <div>{row.catatan_perbaikan}</div>
              </div>
            )}
            {DOC_KEYS.map((k) => (
              <DocInput key={k} rmpId={row.id} field={k} label={DOC_LABELS[k]}
                value={values[k]} onChange={(v) => setField(k, v)} />
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading || !row}
            onClick={() => row && onSubmit({
              rombel_mata_pelajaran_id: row.id,
              ...Object.fromEntries(DOC_KEYS.map((k) => [k, values[k].trim()])),
            })}
          >
            {loading ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocInput({ rmpId, field, label, value, onChange }: {
  rmpId: string; field: DocKey; label: string;
  value: string; onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isStorage = value.startsWith("storage://");
  const fileName = isStorage ? value.split("/").pop() : "";

  const handleFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { toast.error("Ukuran file maksimal 25 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${rmpId}/${field}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("berkas-pembelajaran")
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      onChange(`storage://${path}`);
      toast.success(`${label} berhasil diunggah`);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengunggah");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5 border rounded-md p-2.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={isStorage ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tempel link (Google Drive / lainnya) …"
          disabled={isStorage || uploading}
          className="flex-1 h-9"
        />
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button type="button" variant="outline" size="sm" className="h-9"
          onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">Upload</span>
        </Button>
      </div>
      {isStorage && (
        <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
          <span className="truncate">📎 {fileName}</span>
          <button type="button" onClick={() => onChange("")}
            className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ================ Deadline Countdown ================
function DeadlineCountdown({ deadline, deadlineText }: { deadline: string; deadlineText: string }) {
  const target = useMemo(() => new Date(deadline).getTime(), [deadline]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = target - now;
  const overdue = diff <= 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);

  const totalHours = abs / 3600000;
  const level: "safe" | "warn" | "urgent" | "over" = overdue
    ? "over"
    : totalHours <= 24 ? "urgent"
    : totalHours <= 72 ? "warn"
    : "safe";

  const theme = {
    safe: {
      wrap: "from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-300/60 dark:border-emerald-500/30",
      accent: "text-emerald-700 dark:text-emerald-300",
      chip: "bg-emerald-600 text-white",
      block: "bg-white/70 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-100",
      pulse: "bg-emerald-500",
      label: "Waktu Tersisa",
    },
    warn: {
      wrap: "from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-amber-300/70 dark:border-amber-500/30",
      accent: "text-amber-700 dark:text-amber-300",
      chip: "bg-amber-600 text-white",
      block: "bg-white/70 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-500/30 text-amber-900 dark:text-amber-100",
      pulse: "bg-amber-500",
      label: "Segera Berakhir",
    },
    urgent: {
      wrap: "from-rose-500/15 via-red-500/10 to-orange-500/10 border-rose-300/70 dark:border-rose-500/40",
      accent: "text-rose-700 dark:text-rose-300",
      chip: "bg-rose-600 text-white",
      block: "bg-white/70 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-500/30 text-rose-900 dark:text-rose-100",
      pulse: "bg-rose-500",
      label: "Mendesak!",
    },
    over: {
      wrap: "from-slate-500/10 via-rose-500/10 to-slate-500/10 border-rose-400/60 dark:border-rose-500/40",
      accent: "text-rose-700 dark:text-rose-300",
      chip: "bg-rose-700 text-white",
      block: "bg-white/70 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-500/30 text-rose-900 dark:text-rose-100",
      pulse: "bg-rose-600",
      label: "Terlewat",
    },
  }[level];

  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-br ${theme.wrap}`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/30 dark:bg-white/5 blur-3xl" />
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-lg ${theme.chip} flex items-center justify-center shadow-sm`}>
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Batas Waktu Pengumpulan Berkas</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${theme.chip}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.pulse} animate-pulse`} />
                  {theme.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {overdue ? "Deadline telah terlewat pada " : "Deadline: "}
                <span className={`font-semibold ${theme.accent}`}>{deadlineText}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { v: days, l: "Hari" },
              { v: hours, l: "Jam" },
              { v: minutes, l: "Menit" },
              { v: seconds, l: "Detik" },
            ].map((u, i) => (
              <div key={u.l} className="flex items-center">
                <div className={`min-w-[54px] rounded-lg border px-2 py-1.5 text-center backdrop-blur-sm ${theme.block}`}>
                  <div className={`text-xl sm:text-2xl font-bold tabular-nums leading-tight ${theme.accent}`}>
                    {String(u.v).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{u.l}</div>
                </div>
                {i < 3 && <span className={`mx-1 text-lg font-bold ${theme.accent} opacity-60`}>:</span>}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
