import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Upload } from "lucide-react";
import { listMapel, saveMapel, deleteMapel, importMapel } from "@/lib/sekolah.functions";
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
  const { data = [] } = useQuery({ queryKey: ["mapel"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ nama: string; kode: string | null; kelompok: string | null }[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <CrudTable<Row>
        title="Manajemen Mata Pelajaran"
        description="Daftar mata pelajaran."
        rows={data}
        search={(r, q) => `${r.nama ?? ""} ${r.kode ?? ""} ${r.kelompok ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Kode", cell: (r) => <span className="font-mono text-xs">{r.kode ?? "—"}</span> },
          { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
          { header: "Kelompok", cell: (r) => r.kelompok ? <Badge variant="outline">{r.kelompok}</Badge> : "—" },
        ]}
        onAdd={() => setEditing({})}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
        extra={
          <>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Template
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </>
        }
      />

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
