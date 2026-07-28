import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listKelompokBelajar,
  listPembimbingCandidates,
  listRombelWithStudents,
  saveKelompokBelajar,
  deleteKelompokBelajar,
  importKelompokBelajar,
  type PembimbingRef,
} from "@/lib/kelompok-belajar.functions";
import { listAllStudents } from "@/lib/rombel-members.functions";
import { CrudTable } from "@/components/crud-table";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

const kbQO = queryOptions({ queryKey: ["kelompok-belajar"], queryFn: () => listKelompokBelajar() });
const refsQO = queryOptions({
  queryKey: ["kelompok-belajar-refs"],
  queryFn: async () => {
    const [rs, pc] = await Promise.all([listRombelWithStudents(), listPembimbingCandidates()]);
    return { ...rs, ...pc };
  },
});

export const Route = createFileRoute("/_authenticated/kelompok-belajar")({
  head: () => ({ meta: [{ title: "Kelompok Belajar — SUPREME XPOES" }] }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(kbQO);
    context.queryClient.ensureQueryData(refsQO);
  },
  component: KelompokBelajarPage,
  errorComponent: ({ error }) => (
    <div className="text-destructive">Gagal memuat: {error.message}</div>
  ),
  notFoundComponent: () => <div>Tidak ditemukan</div>,
});

type Row = Awaited<ReturnType<typeof listKelompokBelajar>>[number];

function KelompokBelajarPage() {
  const qc = useQueryClient();
  const { data: rows } = useSuspenseQuery(kbQO);
  const { data: refs } = useSuspenseQuery(refsQO);

  const save = useServerFn(saveKelompokBelajar);
  const del = useServerFn(deleteKelompokBelajar);
  const importFn = useServerFn(importKelompokBelajar);
  const allStudentsFn = useServerFn(listAllStudents);

  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: (v: { id?: string; nama: string; pembimbings: PembimbingRef[]; anggota_ids: string[] }) =>
      save({ data: v }),
    onSuccess: () => {
      toast.success("Kelompok belajar tersimpan");
      qc.invalidateQueries({ queryKey: ["kelompok-belajar"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Gagal menyimpan"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Kelompok belajar dihapus");
      qc.invalidateQueries({ queryKey: ["kelompok-belajar"] });
    },
    onError: (e: any) => toast.error(e?.message || "Gagal menghapus"),
  });

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Kelompok Belajar template
    const tpl = [
      ["Nama Kelompok", "Nama Anggota (pisah koma)", "Nama Pembimbing (pisah koma, opsional)"],
      ["Contoh: Kelompok A", "Budi Santoso, Siti Aminah, Rizky Pratama", "Dra. Ani Wijaya, Bpk. Rahmat"],
    ];
    const wsTpl = XLSX.utils.aoa_to_sheet(tpl);
    wsTpl["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsTpl, "Kelompok Belajar");

    // Sheet 2: Referensi Murid
    const rombelById = new Map(refs.rombel.map((r) => [r.id, r]));
    const stuRows: any[][] = [["Nama", "NIS", "Rombel", "Tingkat", "Konsentrasi"]];
    for (const s of [...refs.students].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))) {
      const r = s.rombel_id ? rombelById.get(s.rombel_id) : null;
      stuRows.push([s.name ?? "", s.nis ?? "", r?.name ?? "", r?.tingkat ?? "", (r as any)?.konsentrasi_keahlian ?? ""]);
    }
    const wsStu = XLSX.utils.aoa_to_sheet(stuRows);
    wsStu["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wsStu, "Referensi Murid");

    // Sheet 3: Referensi Pembimbing
    const pembRows: any[][] = [["Nama", "NIP", "Tipe"]];
    for (const g of refs.guru) pembRows.push([g.nama ?? "", g.nip ?? "", "guru"]);
    for (const t of refs.tendik) pembRows.push([t.nama ?? "", t.nip ?? "", "tendik"]);
    const wsPemb = XLSX.utils.aoa_to_sheet(pembRows);
    wsPemb["!cols"] = [{ wch: 30 }, { wch: 22 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsPemb, "Referensi Pembimbing");

    XLSX.writeFile(wb, "template-kelompok-belajar.xlsx");
  }


  return (
    <>
      <CrudTable<Row>
        title="Kelompok Belajar"
        description="Kelola kelompok belajar: nama, anggota (murid), dan pembimbing (guru/tendik)."
        rows={rows}
        search={(r, q) => r.nama.toLowerCase().includes(q)}
        extra={
          <>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </>
        }
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
        onEdit={(r) => {
          setEditing(r);
          setOpen(true);
        }}
        onDelete={(r) => delMut.mutateAsync(r.id)}
        columns={[
          {
            header: "Nama Kelompok",
            cell: (r) => (
              <Link
                to="/kelompok-belajar/$id"
                params={{ id: r.id }}
                className="font-medium text-primary hover:underline"
              >
                {r.nama}
              </Link>
            ),
            sort: (a, b) => a.nama.localeCompare(b.nama),
          },
          {
            header: "Pembimbing",
            cell: (r) =>
              r.pembimbings.length === 0 ? (
                <span className="text-muted-foreground text-sm">—</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {r.pembimbings.map((p) => (
                    <Badge key={`${p.type}-${p.id}`} variant="secondary" className="text-xs">
                      {p.nama}
                      <span className="ml-1 opacity-70">({p.type})</span>
                    </Badge>
                  ))}
                </div>
              ),
          },
          {
            header: "Jumlah Anggota",
            cell: (r) => <span>{r.anggota_count}</span>,
            sort: (a, b) => a.anggota_count - b.anggota_count,
            className: "w-[140px]",
          },
          {
            header: "Detail",
            cell: (r) => (
              <Link
                to="/kelompok-belajar/$id"
                params={{ id: r.id }}
                className="text-sm text-primary hover:underline"
              >
                Lihat detail
              </Link>
            ),
            className: "w-[120px]",
          },
        ]}
      />

      <EditorDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        refs={refs}
        onSave={(v) => saveMut.mutate(v)}
        saving={saveMut.isPending}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        importFn={importFn}
        onDone={() => qc.invalidateQueries({ queryKey: ["kelompok-belajar"] })}
      />
    </>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  importFn,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  importFn: any;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"upsert" | "replace_all">("upsert");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  function splitList(v: any): string[] {
    if (v == null) return [];
    return String(v).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }

  async function submit() {
    if (!file) {
      toast.error("Pilih file .xlsx terlebih dahulu");
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes("kelompok")) ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows = json
        .map((r) => {
          const nama = String(r["Nama Kelompok"] ?? r["nama"] ?? r["Nama"] ?? "").trim();
          if (!nama) return null;
          const anggota_names = splitList(
            r["Nama Anggota (pisah koma)"] ?? r["Nama Anggota"] ?? r["anggota"] ?? r["Anggota"],
          );
          const pembimbing_names = splitList(
            r["Nama Pembimbing (pisah koma, opsional)"] ?? r["Nama Pembimbing"] ?? r["pembimbing"] ?? r["Pembimbing"],
          );
          return { nama, anggota_names, pembimbing_names };
        })
        .filter(Boolean) as any[];

      if (rows.length === 0) {
        toast.error("Tidak ada baris valid pada sheet Kelompok Belajar");
        setBusy(false);
        return;
      }
      const res = await importFn({ data: { mode, rows } });
      setReport(res);
      toast.success(`Import selesai: ${res.created} baru, ${res.updated} diperbarui`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengimpor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="w-[95vw] max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Kelompok Belajar</DialogTitle>
          <DialogDescription>
            Unggah file <b>.xlsx</b> dengan sheet <b>Kelompok Belajar</b>. Gunakan tombol Template untuk struktur & referensi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>File Excel</Label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upsert">Upsert (tambah/ubah berdasarkan nama)</SelectItem>
                <SelectItem value="replace_all">Ganti Semua (hapus semua kelompok lalu import)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {report && (
            <div className="rounded-md border p-3 text-sm space-y-1 max-h-56 overflow-y-auto">
              <div>Baru: <b>{report.created}</b> · Diperbarui: <b>{report.updated}</b></div>
              <div>Total anggota: <b>{report.total_anggota}</b> · Pembimbing: <b>{report.total_pembimbing}</b></div>
              {report.missing_names?.length > 0 && (
                <div className="text-amber-600">
                  Nama murid tidak ditemukan ({report.missing_names.length}):
                  <ul className="list-disc ml-5">{report.missing_names.slice(0, 20).map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {report.ambiguous_names?.length > 0 && (
                <div className="text-amber-600">
                  Nama murid ambigu ({report.ambiguous_names.length}) — dipakai kandidat pertama:
                  <ul className="list-disc ml-5">{report.ambiguous_names.slice(0, 20).map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {report.missing_pembimbing?.length > 0 && (
                <div className="text-amber-600">
                  Nama pembimbing tidak ditemukan ({report.missing_pembimbing.length}):
                  <ul className="list-disc ml-5">{report.missing_pembimbing.slice(0, 20).map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {report.ambiguous_pembimbing?.length > 0 && (
                <div className="text-amber-600">
                  Nama pembimbing ambigu ({report.ambiguous_pembimbing.length}) — dipakai kandidat pertama:
                  <ul className="list-disc ml-5">{report.ambiguous_pembimbing.slice(0, 20).map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
              {report.errors?.length > 0 && (
                <div className="text-destructive">
                  Error ({report.errors.length}):
                  <ul className="list-disc ml-5">{report.errors.slice(0, 20).map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Tutup</Button>
          <Button onClick={submit} disabled={busy || !file}>{busy ? "Mengimpor…" : "Import"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditorDialog({
  open,
  onOpenChange,
  editing,
  refs,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Row | null;
  refs: {
    rombel: { id: string; name: string | null; tingkat: string | null; konsentrasi_keahlian: string | null }[];
    students: { id: string; name: string | null; nis: string | null; rombel_id: string | null }[];
    guru: { id: string; nama: string | null; nip: string | null }[];
    tendik: { id: string; nama: string | null; nip: string | null }[];
  };
  onSave: (v: { id?: string; nama: string; pembimbings: PembimbingRef[]; anggota_ids: string[] }) => void;
  saving: boolean;
}) {
  const [nama, setNama] = useState("");
  const [pembimbings, setPembimbings] = useState<PembimbingRef[]>([]);
  const [anggotaIds, setAnggotaIds] = useState<Set<string>>(new Set());
  const [selectedRombel, setSelectedRombel] = useState<string>("");
  const [searchStudent, setSearchStudent] = useState("");
  const [pembimbingType, setPembimbingType] = useState<"guru" | "tendik">("guru");
  const [pembimbingId, setPembimbingId] = useState<string>("");

  // Reset when opening
  useState(() => {}); // noop
  const key = editing?.id ?? "new";
  useMemo(() => {
    setNama(editing?.nama ?? "");
    setPembimbings(editing?.pembimbings.map((p) => ({ type: p.type, id: p.id })) ?? []);
    setAnggotaIds(new Set(editing?.anggota_ids ?? []));
    setSelectedRombel("");
    setSearchStudent("");
    setPembimbingType("guru");
    setPembimbingId("");
  }, [key, open]);

  const studentsInRombel = useMemo(() => {
    if (!selectedRombel) return [];
    const q = searchStudent.trim().toLowerCase();
    return refs.students
      .filter((s) => s.rombel_id === selectedRombel)
      .filter((s) => !q || (s.name ?? "").toLowerCase().includes(q) || (s.nis ?? "").toLowerCase().includes(q));
  }, [refs.students, selectedRombel, searchStudent]);

  const selectedStudents = useMemo(
    () => refs.students.filter((s) => anggotaIds.has(s.id)),
    [refs.students, anggotaIds],
  );

  const rombelById = useMemo(
    () => new Map(refs.rombel.map((r) => [r.id, r])),
    [refs.rombel],
  );

  function togglePembimbingCandidateList() {
    const list = pembimbingType === "guru" ? refs.guru : refs.tendik;
    return list;
  }

  function addPembimbing() {
    if (!pembimbingId) return;
    if (pembimbings.some((p) => p.type === pembimbingType && p.id === pembimbingId)) {
      toast.error("Pembimbing sudah ditambahkan");
      return;
    }
    setPembimbings((prev) => [...prev, { type: pembimbingType, id: pembimbingId }]);
    setPembimbingId("");
  }

  function removePembimbing(p: PembimbingRef) {
    setPembimbings((prev) => prev.filter((x) => !(x.type === p.type && x.id === p.id)));
  }

  function pembimbingLabel(p: PembimbingRef) {
    const src = p.type === "guru" ? refs.guru.find((g) => g.id === p.id) : refs.tendik.find((t) => t.id === p.id);
    return src?.nama ?? "(tidak ditemukan)";
  }

  function submit() {
    if (!nama.trim()) {
      toast.error("Nama kelompok wajib diisi");
      return;
    }
    onSave({
      id: editing?.id,
      nama: nama.trim(),
      pembimbings,
      anggota_ids: Array.from(anggotaIds),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Ubah" : "Tambah"} Kelompok Belajar</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nama Kelompok</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Kelompok Matematika A" />
          </div>

          <div className="space-y-2">
            <Label>Pembimbing</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {pembimbings.length === 0 && (
                <span className="text-sm text-muted-foreground">Belum ada pembimbing.</span>
              )}
              {pembimbings.map((p) => (
                <Badge key={`${p.type}-${p.id}`} variant="secondary" className="gap-1">
                  {pembimbingLabel(p)}
                  <span className="opacity-70 text-xs">({p.type})</span>
                  <button
                    type="button"
                    onClick={() => removePembimbing(p)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={pembimbingType} onValueChange={(v) => { setPembimbingType(v as any); setPembimbingId(""); }}>
                <SelectTrigger className="sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="guru">Guru</SelectItem>
                  <SelectItem value="tendik">Tendik</SelectItem>
                </SelectContent>
              </Select>
              <Select value={pembimbingId} onValueChange={setPembimbingId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih pembimbing" /></SelectTrigger>
                <SelectContent>
                  {togglePembimbingCandidateList().map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}{p.nip ? ` — ${p.nip}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addPembimbing} disabled={!pembimbingId}>
                Tambah
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Anggota (Murid)</Label>
              <span className="text-xs text-muted-foreground">{anggotaIds.size} dipilih</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedRombel} onValueChange={setSelectedRombel}>
                <SelectTrigger className="sm:w-[260px]">
                  <SelectValue placeholder="Pilih rombel terlebih dahulu" />
                </SelectTrigger>
                <SelectContent>
                  {refs.rombel.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.tingkat} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Cari nama / NIS…"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                disabled={!selectedRombel}
                className="flex-1"
              />
            </div>

            <div className="rounded-md border">
              <ScrollArea className="h-56">
                {!selectedRombel ? (
                  <div className="p-4 text-sm text-muted-foreground">Pilih rombel untuk melihat daftar murid.</div>
                ) : studentsInRombel.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Tidak ada murid pada rombel ini.</div>
                ) : (
                  <div className="divide-y">
                    <div className="flex items-center gap-2 p-2 bg-muted/40">
                      <Checkbox
                        checked={studentsInRombel.every((s) => anggotaIds.has(s.id))}
                        onCheckedChange={(v) => {
                          setAnggotaIds((prev) => {
                            const next = new Set(prev);
                            if (v) studentsInRombel.forEach((s) => next.add(s.id));
                            else studentsInRombel.forEach((s) => next.delete(s.id));
                            return next;
                          });
                        }}
                      />
                      <span className="text-xs font-medium">Pilih semua di rombel ini</span>
                    </div>
                    {studentsInRombel.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30">
                        <Checkbox
                          checked={anggotaIds.has(s.id)}
                          onCheckedChange={(v) => {
                            setAnggotaIds((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(s.id);
                              else next.delete(s.id);
                              return next;
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground truncate">NIS: {s.nis}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {selectedStudents.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Anggota terpilih:</div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto rounded-md border p-2">
                  {selectedStudents.map((s) => {
                    const r = s.rombel_id ? rombelById.get(s.rombel_id) : null;
                    return (
                      <Badge key={s.id} variant="outline" className="gap-1">
                        <span className="truncate max-w-[160px]">{s.name}</span>
                        {r && <span className="opacity-60 text-[10px]">{r.name}</span>}
                        <button
                          type="button"
                          onClick={() =>
                            setAnggotaIds((prev) => {
                              const next = new Set(prev);
                              next.delete(s.id);
                              return next;
                            })
                          }
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
