import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createAktivitas } from "@/lib/aktivitas.functions";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { withDateSuffix } from "@/lib/utils";
import {
  Settings, CalendarClock, QrCode, Plus, Trash2, Download, Upload, RotateCcw,
  ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw, ArchiveRestore, Eraser, Pencil,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPembelajaranSettings, saveDeadline, setKbmQrValidation,
  setAdministrasiUploadEnabled,
  listPembelajaranRefs, listRombelMapel, createRombelMapel,
  updateRombelMapel, bulkUpdateRombelMapel,
  softDeleteRombelMapel, restoreRombelMapel, purgeRombelMapel,
  softDeleteAllRombelMapel, emptyTrashRombelMapel, bulkImportRombelMapel,
} from "@/lib/pengaturan-pembelajaran.functions";
import * as XLSX from "xlsx";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/pembelajaran/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Pembelajaran — SUPREME XPOES" }] }),
  component: PengaturanPembelajaranPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal: {error.message}</div>,
});

type SortKey =
  | "no_asc" | "no_desc"
  | "rombel_asc" | "rombel_desc"
  | "kelompok_asc" | "kelompok_desc"
  | "mapel_asc" | "mapel_desc"
  | "guru_asc" | "guru_desc";

function PengaturanPembelajaranPage() {
  const qc = useQueryClient();

  const getSettingsFn = useServerFn(getPembelajaranSettings);
  const saveDeadlineFn = useServerFn(saveDeadline);
  const setQrFn = useServerFn(setKbmQrValidation);
  const listRefsFn = useServerFn(listPembelajaranRefs);
  const listFn = useServerFn(listRombelMapel);
  const createFn = useServerFn(createRombelMapel);
  const updateFn = useServerFn(updateRombelMapel);
  const bulkUpdateFn = useServerFn(bulkUpdateRombelMapel);
  const delFn = useServerFn(softDeleteRombelMapel);
  const restoreFn = useServerFn(restoreRombelMapel);
  const purgeFn = useServerFn(purgeRombelMapel);
  const delAllFn = useServerFn(softDeleteAllRombelMapel);
  const emptyTrashFn = useServerFn(emptyTrashRombelMapel);
  const importFn = useServerFn(bulkImportRombelMapel);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filters
  const [rombelId, setRombelId] = useState("all");
  const [mapelId, setMapelId] = useState("all");
  const [guruId, setGuruId] = useState("all");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("no_asc");
  const [trashOpen, setTrashOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  // Deadline local state
  const [deadlineLocal, setDeadlineLocal] = useState<string>("");
  const [deadlineDirty, setDeadlineDirty] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["pembelajaran-settings"],
    queryFn: async () => {
      const s = await getSettingsFn();
      if (!deadlineDirty) setDeadlineLocal(s.deadline || "");
      return s;
    },
  });

  const { data: refs } = useQuery({
    queryKey: ["pembelajaran-refs"],
    queryFn: () => listRefsFn(),
  });

  const { data: list, isFetching } = useQuery({
    queryKey: ["rombel-mapel", { rombelId, mapelId, guruId, page, pageSize, sort }],
    queryFn: () => listFn({
      data: {
        rombel_id: rombelId, mapel_id: mapelId, guru_id: guruId,
        page, pageSize, sort,
      },
    }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["rombel-mapel"] });
    qc.invalidateQueries({ queryKey: ["rombel-mapel-trash"] });
  };

  const saveDeadlineM = useMutation({
    mutationFn: () => saveDeadlineFn({ data: { deadline: deadlineLocal } }),
    onSuccess: () => {
      toast.success("Deadline disimpan");
      setDeadlineDirty(false);
      qc.invalidateQueries({ queryKey: ["pembelajaran-settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleQrM = useMutation({
    mutationFn: (v: boolean) => setQrFn({ data: { enabled: v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pembelajaran-settings"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const createM = useMutation({
    mutationFn: (v: { rombel_id: string; mata_pelajaran_id: string; guru_id: string }) =>
      createFn({ data: v }),
    onSuccess: () => {
      toast.success("Ditambahkan");
      setAddOpen(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateM = useMutation({
    mutationFn: (v: { id: string; rombel_id?: string; mata_pelajaran_id?: string; guru_id?: string }) =>
      updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Perubahan disimpan");
      setEditRow(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkUpdateM = useMutation({
    mutationFn: (v: { ids: string[]; rombel_id?: string; mata_pelajaran_id?: string; guru_id?: string }) =>
      bulkUpdateFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`${r.affected} data diperbarui`);
      setBulkEditOpen(false);
      setSelectedIds(new Set());
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dipindahkan ke tempat sampah"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const delAllM = useMutation({
    mutationFn: () => delAllFn(),
    onSuccess: (r: any) => { toast.success(`${r.affected} data dipindahkan ke tempat sampah`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const emptyTrashM = useMutation({
    mutationFn: () => emptyTrashFn(),
    onSuccess: (r: any) => {
      toast.success(`${r.affected} data dihapus permanen dari tempat sampah`);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Import progress state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({
    done: 0,
    total: 0,
    inserted: 0,
    failed: 0,
    errors: [] as { row: number; message: string }[],
  });
  const [importFinished, setImportFinished] = useState(false);

  const runImport = async (allRows: { rombel: string; mapel: string; guru: string }[]) => {
    setImporting(true);
    setImportFinished(false);
    setImportProgress({ done: 0, total: allRows.length, inserted: 0, failed: 0, errors: [] });
    const chunkSize = 1;
    let inserted = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);
      try {
        const r: any = await importFn({ data: { rows: chunk } });
        inserted += r.inserted ?? 0;
        failed += r.failed ?? 0;
        if (Array.isArray(r.errors)) {
          for (const e of r.errors) {
            errors.push({ row: i + (e.row - 2) + 2, message: e.message });
          }
        }
      } catch (e: any) {
        failed += chunk.length;
        errors.push({ row: i + 2, message: e?.message ?? "Gagal" });
      }
      setImportProgress({
        done: Math.min(i + chunk.length, allRows.length),
        total: allRows.length,
        inserted,
        failed,
        errors,
      });
    }
    setImportFinished(true);
    if (inserted > 0) toast.success(`${inserted} data berhasil diimpor`);
    if (failed > 0) toast.error(`${failed} baris gagal`);
    createAktivitas({
      data: {
        action: "import",
        description: `Mengimpor ${inserted} data pembelajaran (gagal ${failed} dari ${allRows.length} baris)`,
        metadata: { inserted, failed, total: allRows.length },
      },
    }).catch(() => {});
    invalidate();
  };


  const downloadTemplate = () => {
    const sampleRombel = (refs?.rombel ?? [])[0]?.name ?? "X TKJ 1";
    const sampleMapel = (refs?.mapel ?? [])[0]?.nama ?? "Matematika";
    const sampleGuru = (refs?.guru ?? [])[0]?.nip ?? (refs?.guru ?? [])[0]?.nama ?? "198001012005011001";
    const ws = XLSX.utils.aoa_to_sheet([
      ["Rombel", "Mata Pelajaran", "Guru (NIP atau Nama)"],
      [sampleRombel, sampleMapel, sampleGuru],
    ]);
    ws["!cols"] = [{ wch: 24 }, { wch: 32 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, withDateSuffix("template-rombel-mata-pelajaran.xlsx"));
    toast.success("Template diunduh");
  };

  const handleImportFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const parsed = rows
        .map((r) => {
          const rombel = String(r["Rombel"] ?? r["rombel"] ?? "").trim();
          const mapel = String(r["Mata Pelajaran"] ?? r["mapel"] ?? r["Mapel"] ?? "").trim();
          const guru = String(
            r["Guru (NIP atau Nama)"] ?? r["Guru"] ?? r["guru"] ?? r["NIP"] ?? r["nip"] ?? "",
          ).trim();
          return { rombel, mapel, guru };
        })
        .filter((r) => r.rombel && r.mapel && r.guru);
      if (parsed.length === 0) {
        toast.error("File kosong atau format tidak dikenali");
        return;
      }
      runImport(parsed);
    } catch (e: any) {
      toast.error("Gagal membaca file: " + (e?.message ?? "unknown"));
    }
  };

  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const deadlinePreview = useMemo(() => {
    if (!deadlineLocal) return "";
    const d = new Date(deadlineLocal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).replace(",", "") + " WIB";
  }, [deadlineLocal]);

  const sortIcon = (col: "rombel" | "kelompok" | "mapel" | "guru") => (
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Pengaturan Pembelajaran</h1>
            <p className="text-sm text-muted-foreground">
              Kelola mata pelajaran dan guru pengampu untuk setiap rombel
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
            <RotateCcw className="h-4 w-4 mr-2" />Tempat Sampah
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />Download Template
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importing ? "Mengimpor…" : "Import"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Tambah Data
          </Button>
        </div>
      </div>

      {/* Batas Waktu Pengumpulan Berkas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-amber-600" />
            Batas Waktu Pengumpulan Berkas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-xs">Tanggal &amp; Waktu Deadline</Label>
              <Input
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => { setDeadlineLocal(e.target.value); setDeadlineDirty(true); }}
                className="mt-1 max-w-[240px]"
              />
              {deadlinePreview && (
                <p className="text-xs text-muted-foreground mt-2">Preview: {deadlinePreview}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Deadline ini akan ditampilkan di halaman Administrasi Pembelajaran sebagai pengingat bagi guru.
              </p>
            </div>
            <Button
              onClick={() => saveDeadlineM.mutate()}
              disabled={saveDeadlineM.isPending || !deadlineDirty}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveDeadlineM.isPending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pengaturan Validasi KBM */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-blue-600" />
            Pengaturan Validasi KBM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="font-medium text-sm">Validasi QR Code</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktifkan validasi QR Code untuk input KBM. Jika aktif, murid wajib scan QR dari guru
                sebelum mengisi agenda dengan status "Masuk".
              </p>
            </div>
            <Switch
              checked={!!settings?.kbm_qr_enabled}
              onCheckedChange={(v) => toggleQrM.mutate(v)}
              disabled={toggleQrM.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Daftar Mata Pelajaran */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Daftar Mata Pelajaran</CardTitle>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Pindahkan SEMUA data ke tempat sampah?")) delAllM.mutate();
              }}
              disabled={delAllM.isPending || total === 0}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus Semua
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={rombelId} onValueChange={(v) => { setPage(1); setRombelId(v); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter Rombel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rombel</SelectItem>
                {(refs?.rombel ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mapelId} onValueChange={(v) => { setPage(1); setMapelId(v); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter Mapel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mapel</SelectItem>
                {(refs?.mapel ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={guruId} onValueChange={(v) => { setPage(1); setGuruId(v); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter Guru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Guru</SelectItem>
                {(refs?.guru ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / halaman</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(rombelId !== "all" || mapelId !== "all" || guruId !== "all") && (
              <Button
                size="sm" variant="ghost"
                onClick={() => { setRombelId("all"); setMapelId("all"); setGuruId("all"); setPage(1); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />Reset
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              Menampilkan {(list?.rows ?? []).length === 0 ? 0 : (page - 1) * pageSize + 1}
              –{(page - 1) * pageSize + (list?.rows ?? []).length} dari {total} data
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{selectedIds.size} terpilih</span>
                <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Bulk Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Batal Pilih
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        (list?.rows ?? []).length > 0 &&
                        (list?.rows ?? []).every((r: any) => selectedIds.has(r.id))
                      }
                      onCheckedChange={(v) => {
                        const rows = list?.rows ?? [];
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (v) rows.forEach((r: any) => next.add(r.id));
                          else rows.forEach((r: any) => next.delete(r.id));
                          return next;
                        });
                      }}
                      aria-label="Pilih semua"
                    />
                  </TableHead>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Rombel {sortIcon("rombel")}</TableHead>
                  <TableHead>Kelompok Mapel {sortIcon("kelompok")}</TableHead>
                  <TableHead>Mata Pelajaran {sortIcon("mapel")}</TableHead>
                  <TableHead>Guru Pengampu {sortIcon("guru")}</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching && (list?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
                )}
                {!isFetching && (list?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
                )}
                {(list?.rows ?? []).map((r: any, idx: number) => (
                  <TableRow key={r.id} data-state={selectedIds.has(r.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={(v) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(r.id); else next.delete(r.id);
                            return next;
                          });
                        }}
                        aria-label="Pilih baris"
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell className="font-medium">{r.rombel_name}</TableCell>
                    <TableCell className="text-sm">{r.mapel_kelompok}</TableCell>
                    <TableCell className="text-sm">{r.mapel_nama}</TableCell>
                    <TableCell className="text-sm">
                      {r.guru_nama}
                      {r.guru_nip && (
                        <span className="text-muted-foreground"> ({r.guru_nip})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon" variant="outline" className="h-8 w-8"
                          onClick={() => setEditRow(r)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon" variant="destructive" className="h-8 w-8"
                          onClick={() => { if (confirm("Pindahkan ke tempat sampah?")) delM.mutate(r.id); }}
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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

      {/* Dialog Tambah */}
      <TambahDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        refs={refs}
        onSubmit={(v) => createM.mutate(v)}
        loading={createM.isPending}
      />

      {/* Dialog Edit */}
      <EditDialog
        row={editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        refs={refs}
        onSubmit={(v) => updateM.mutate(v)}
        loading={updateM.isPending}
      />

      {/* Dialog Bulk Edit */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        refs={refs}
        count={selectedIds.size}
        onSubmit={(v) => bulkUpdateM.mutate({ ids: Array.from(selectedIds), ...v })}
        loading={bulkUpdateM.isPending}
      />

      {/* Dialog Tempat Sampah */}
      <TrashDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        listFn={listFn}
        restoreFn={restoreFn}
        purgeFn={purgeFn}
        emptyTrashM={emptyTrashM}
        onChange={invalidate}
      />

      {/* Dialog Progress Import */}
      <Dialog
        open={importing}
        onOpenChange={(o) => {
          if (!o && importFinished) setImporting(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {importFinished ? "Import Selesai" : "Mengimpor Data…"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Progress
              value={
                importProgress.total > 0
                  ? (importProgress.done / importProgress.total) * 100
                  : 0
              }
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {importProgress.done} / {importProgress.total} baris
              </span>
              <span className="font-medium">
                {importProgress.total > 0
                  ? Math.round((importProgress.done / importProgress.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Berhasil</div>
                <div className="font-semibold text-green-600">
                  {importProgress.inserted}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-muted-foreground">Gagal</div>
                <div className="font-semibold text-red-600">
                  {importProgress.failed}
                </div>
              </div>
            </div>
            {importFinished && importProgress.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-xs space-y-1">
                {importProgress.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="text-muted-foreground">
                    Baris {e.row}: {e.message}
                  </div>
                ))}
                {importProgress.errors.length > 20 && (
                  <div className="text-muted-foreground italic">
                    …dan {importProgress.errors.length - 20} lainnya
                  </div>
                )}
              </div>
            )}
          </div>
          {importFinished && (
            <DialogFooter>
              <Button onClick={() => setImporting(false)}>Tutup</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ================ Tambah Dialog ================
function TambahDialog({
  open, onOpenChange, refs, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refs: any;
  onSubmit: (v: { rombel_id: string; mata_pelajaran_id: string; guru_id: string }) => void;
  loading: boolean;
}) {
  const [rombel, setRombel] = useState("");
  const [mapel, setMapel] = useState("");
  const [guru, setGuru] = useState("");

  const reset = () => { setRombel(""); setMapel(""); setGuru(""); };
  const canSubmit = rombel && mapel && guru;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Mata Pelajaran ke Rombel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Rombel</Label>
            <Select value={rombel} onValueChange={setRombel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Rombel" /></SelectTrigger>
              <SelectContent>
                {(refs?.rombel ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mata Pelajaran</Label>
            <Select value={mapel} onValueChange={setMapel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
              <SelectContent>
                {(refs?.mapel ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}{m.kelompok ? ` — ${m.kelompok}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Guru Pengampu</Label>
            <Select value={guru} onValueChange={setGuru}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                {(refs?.guru ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nama}{g.nip ? ` (${g.nip})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => onSubmit({ rombel_id: rombel, mata_pelajaran_id: mapel, guru_id: guru })}
            disabled={!canSubmit || loading}
          >
            {loading ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ================ Trash Dialog ================
function TrashDialog({
  open, onOpenChange, listFn, restoreFn, purgeFn, emptyTrashM, onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  listFn: any;
  restoreFn: any;
  purgeFn: any;
  emptyTrashM: any;
  onChange: () => void;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["rombel-mapel-trash"],
    queryFn: () => listFn({ data: { trashed: true, page: 1, pageSize: 100 } }),
    enabled: open,
  });

  const handleEmptyTrash = () => {
    if (confirm("Kosongkan tempat sampah? Semua data yang ada di tempat sampah akan dihapus permanen dan tidak dapat dipulihkan.")) {
      emptyTrashM.mutate();
    }
  };

  const restore = useMutation({
    mutationFn: (id: string) => restoreFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dipulihkan");
      qc.invalidateQueries({ queryKey: ["rombel-mapel-trash"] });
      onChange();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const purge = useMutation({
    mutationFn: (id: string) => purgeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dihapus permanen");
      qc.invalidateQueries({ queryKey: ["rombel-mapel-trash"] });
      onChange();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Tempat Sampah
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Data yang dihapus dapat dipulihkan atau dihapus permanen.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmptyTrash}
              disabled={emptyTrashM.isPending || (data?.total ?? 0) === 0}
            >
              <Eraser className="h-4 w-4 mr-2" />
              {emptyTrashM.isPending ? "Mengosongkan…" : "Kosongkan Tempat Sampah"}
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Rombel</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Tempat sampah kosong</TableCell></TableRow>
              )}
              {(data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.rombel_name}</TableCell>
                  <TableCell className="text-sm">
                    {r.mapel_nama}
                    <div className="text-xs text-muted-foreground">{r.mapel_kelompok}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.guru_nama}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => restore.mutate(r.id)} disabled={restore.isPending}>
                        <ArchiveRestore className="h-3.5 w-3.5 mr-1" />Pulihkan
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        onClick={() => { if (confirm("Hapus permanen?")) purge.mutate(r.id); }}
                        disabled={purge.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ================ Edit Dialog ================
function EditDialog({
  row, onOpenChange, refs, onSubmit, loading,
}: {
  row: any | null;
  onOpenChange: (v: boolean) => void;
  refs: any;
  onSubmit: (v: { id: string; rombel_id: string; mata_pelajaran_id: string; guru_id: string }) => void;
  loading: boolean;
}) {
  const [rombel, setRombel] = useState("");
  const [mapel, setMapel] = useState("");
  const [guru, setGuru] = useState("");

  useEffect(() => {
    if (row) {
      setRombel(row.rombel_id ?? "");
      setMapel(row.mata_pelajaran_id ?? "");
      setGuru(row.guru_id ?? "");
    }
  }, [row?.id]);

  const canSubmit = !!row && rombel && mapel && guru;

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pembelajaran</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Rombel</Label>
            <Select value={rombel} onValueChange={setRombel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Rombel" /></SelectTrigger>
              <SelectContent>
                {(refs?.rombel ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mata Pelajaran</Label>
            <Select value={mapel} onValueChange={setMapel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
              <SelectContent>
                {(refs?.mapel ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}{m.kelompok ? ` — ${m.kelompok}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Guru Pengampu</Label>
            <Select value={guru} onValueChange={setGuru}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Guru" /></SelectTrigger>
              <SelectContent>
                {(refs?.guru ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nama}{g.nip ? ` (${g.nip})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onSubmit({ id: row!.id, rombel_id: rombel, mata_pelajaran_id: mapel, guru_id: guru })}
            disabled={!canSubmit || loading}
          >
            {loading ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ================ Bulk Edit Dialog ================
function BulkEditDialog({
  open, onOpenChange, refs, count, onSubmit, loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  refs: any;
  count: number;
  onSubmit: (v: { rombel_id?: string; mata_pelajaran_id?: string; guru_id?: string }) => void;
  loading: boolean;
}) {
  const [rombel, setRombel] = useState("");
  const [mapel, setMapel] = useState("");
  const [guru, setGuru] = useState("");

  const reset = () => { setRombel(""); setMapel(""); setGuru(""); };
  const hasAny = !!(rombel || mapel || guru);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit ({count} data terpilih)</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Hanya field yang diisi yang akan diubah pada semua data terpilih.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Rombel</Label>
            <Select value={rombel} onValueChange={setRombel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="— Tidak diubah —" /></SelectTrigger>
              <SelectContent>
                {(refs?.rombel ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mata Pelajaran</Label>
            <Select value={mapel} onValueChange={setMapel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="— Tidak diubah —" /></SelectTrigger>
              <SelectContent>
                {(refs?.mapel ?? []).map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nama}{m.kelompok ? ` — ${m.kelompok}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Guru Pengampu</Label>
            <Select value={guru} onValueChange={setGuru}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="— Tidak diubah —" /></SelectTrigger>
              <SelectContent>
                {(refs?.guru ?? []).map((g: any) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nama}{g.nip ? ` (${g.nip})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => onSubmit({
              rombel_id: rombel || undefined,
              mata_pelajaran_id: mapel || undefined,
              guru_id: guru || undefined,
            })}
            disabled={!hasAny || loading}
          >
            {loading ? "Menyimpan…" : `Terapkan ke ${count} data`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
