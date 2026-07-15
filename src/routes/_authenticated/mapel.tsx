import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Upload, Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { listMapel, saveMapel, deleteMapel, importMapel, bulkDeleteMapel, bulkUpdateMapelKelompok } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = { id: string; nama: string | null; kode: string | null; kelompok: string | null };

export const Route = createFileRoute("/_authenticated/mapel")({
  head: () => ({ meta: [{ title: "Mata Pelajaran — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listMapel);
  const saveFn = useServerFn(saveMapel);
  const delFn = useServerFn(deleteMapel);
  const importFn = useServerFn(importMapel);
  const bulkDelFn = useServerFn(bulkDeleteMapel);
  const bulkUpdFn = useServerFn(bulkUpdateMapelKelompok);
  const { data = [] } = useQuery({ queryKey: ["mapel"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ nama: string; kode: string | null; kelompok: string | null }[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkKelompok, setBulkKelompok] = useState("");

  const filtered = useMemo(() => {
    if (!q) return data;
    const s = q.toLowerCase();
    return data.filter((r) => `${r.nama ?? ""} ${r.kode ?? ""} ${r.kelompok ?? ""}`.toLowerCase().includes(s));
  }, [data, q]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someChecked = filtered.some((r) => selected.has(r.id));
  const toggleAll = (v: boolean) => {
    const n = new Set(selected);
    if (v) filtered.forEach((r) => n.add(r.id));
    else filtered.forEach((r) => n.delete(r.id));
    setSelected(n);
  };
  const toggleOne = (id: string, v: boolean) => {
    const n = new Set(selected);
    if (v) n.add(id); else n.delete(id);
    setSelected(n);
  };
  const clearSelection = () => setSelected(new Set());

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["mapel"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["mapel"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkDel = useMutation({
    mutationFn: (ids: string[]) => bulkDelFn({ data: { ids } }),
    onSuccess: (r: any) => {
      toast.success(`${r.count} mata pelajaran dihapus`);
      qc.invalidateQueries({ queryKey: ["mapel"] });
      clearSelection();
      setConfirmBulk(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkUpd = useMutation({
    mutationFn: (v: { ids: string[]; kelompok: string | null }) => bulkUpdFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`${r.count} mata pelajaran diperbarui`);
      qc.invalidateQueries({ queryKey: ["mapel"] });
      clearSelection();
      setBulkEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const imp = useMutation({
    mutationFn: (v: { rows: typeof importRows; mode: "append" | "replace" }) => importFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`Berhasil impor ${r.count} mata pelajaran`);
      qc.invalidateQueries({ queryKey: ["mapel"] });
      setImportOpen(false);
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nama", "kode", "kelompok"],
      ["Matematika", "MTK", "A"],
      ["Bahasa Indonesia", "BIN", "A"],
      ["Produk Kreatif dan Kewirausahaan", "PKK", "C3"],
    ]);
    ws["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mata Pelajaran");
    XLSX.writeFile(wb, "template-mata-pelajaran.xlsx");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const rows = json
        .map((r) => {
          const nama = String(r.nama ?? r.Nama ?? r.NAMA ?? "").trim();
          const kode = String(r.kode ?? r.Kode ?? r.KODE ?? "").trim();
          const kelompok = String(r.kelompok ?? r.Kelompok ?? r.KELOMPOK ?? "").trim();
          return { nama, kode: kode || null, kelompok: kelompok || null };
        })
        .filter((r) => r.nama.length > 0);
      if (!rows.length) {
        toast.error("Tidak ada baris valid. Pastikan kolom 'nama' terisi.");
        return;
      }
      setImportRows(rows);
    } catch (e: any) {
      toast.error("Gagal membaca file: " + e.message);
    }
  };

  const selectedIds = Array.from(selected);
  const selectedCount = selectedIds.length;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Mata Pelajaran</h1>
            <p className="text-sm text-muted-foreground">Daftar mata pelajaran.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Template
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
            <Button onClick={() => setEditing({})}>
              <Plus className="mr-2 h-4 w-4" /> Tambah
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {selectedCount > 0 && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5">
                  <span className="text-sm font-medium">{selectedCount} dipilih</span>
                  <Button size="sm" variant="outline" onClick={() => { setBulkKelompok(""); setBulkEditOpen(true); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Kelompok
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmBulk(true)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                  </Button>
                  <Button size="icon" variant="ghost" onClick={clearSelection}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allChecked ? true : someChecked ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAll(!!v)}
                        aria-label="Pilih semua"
                      />
                    </TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelompok</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={(v) => toggleOne(row.id, !!v)}
                            aria-label={`Pilih ${row.nama}`}
                          />
                        </TableCell>
                        <TableCell><span className="font-mono text-xs">{row.kode ?? "—"}</span></TableCell>
                        <TableCell><span className="font-medium">{row.nama}</span></TableCell>
                        <TableCell>{row.kelompok ? <Badge variant="outline">{row.kelompok}</Badge> : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setConfirmRow(row)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Mata Pelajaran</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Kode</Label><Input value={editing.kode ?? ""} onChange={(e) => setEditing({ ...editing, kode: e.target.value })} /></div>
                <div className="col-span-2"><Label>Nama *</Label><Input value={editing.nama ?? ""} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} /></div>
              </div>
              <div><Label>Kelompok</Label><Input value={editing.kelompok ?? ""} onChange={(e) => setEditing({ ...editing, kelompok: e.target.value })} placeholder="A / B / C1 / C2 / C3" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({ id: editing?.id, nama: editing?.nama, kode: editing?.kode || null, kelompok: editing?.kelompok || null })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Kelompok Massal</DialogTitle>
            <DialogDescription>
              Perbarui kelompok untuk {selectedCount} mata pelajaran terpilih. Kosongkan untuk menghapus kelompok.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Kelompok</Label>
            <Input value={bulkKelompok} onChange={(e) => setBulkKelompok(e.target.value)} placeholder="A / B / C1 / C2 / C3" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Batal</Button>
            <Button
              disabled={bulkUpd.isPending}
              onClick={() => bulkUpd.mutate({ ids: selectedIds, kelompok: bulkKelompok.trim() || null })}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (confirmRow) await del.mutateAsync(confirmRow.id); setConfirmRow(null); }}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedCount} mata pelajaran?</AlertDialogTitle>
            <AlertDialogDescription>Aksi ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDel.mutate(selectedIds)}>Hapus Semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); if (fileRef.current) fileRef.current.value = ""; } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Mata Pelajaran</DialogTitle>
            <DialogDescription>
              Unggah file Excel (.xlsx) atau CSV dengan kolom: <b>nama</b>, <b>kode</b>, <b>kelompok</b>. Unduh template untuk contoh format.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Button variant="outline" size="sm" className="w-fit" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Unduh Template
            </Button>
            <div>
              <Label>File</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            <div>
              <Label>Mode Import</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)} className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="m-append" />
                  <Label htmlFor="m-append" className="font-normal">Tambahkan ke data yang ada</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="m-replace" />
                  <Label htmlFor="m-replace" className="font-normal text-destructive">Ganti semua (hapus data lama)</Label>
                </div>
              </RadioGroup>
            </div>
            {importRows.length > 0 && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium mb-2">Preview: {importRows.length} baris siap diimpor</div>
                <div className="max-h-40 overflow-auto space-y-1 text-xs text-muted-foreground">
                  {importRows.slice(0, 10).map((r, i) => (
                    <div key={i}>{r.kode ? `[${r.kode}] ` : ""}{r.nama}{r.kelompok ? ` — ${r.kelompok}` : ""}</div>
                  ))}
                  {importRows.length > 10 && <div>… dan {importRows.length - 10} baris lainnya</div>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
            <Button
              disabled={imp.isPending || importRows.length === 0}
              onClick={() => imp.mutate({ rows: importRows, mode: importMode })}
            >
              {imp.isPending ? "Mengimpor…" : `Impor ${importRows.length} baris`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
