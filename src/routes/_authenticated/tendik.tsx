import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Upload } from "lucide-react";
import { listTendik, saveTendik, deleteTendik, importTendik } from "@/lib/sekolah.functions";
import { TendikStats } from "@/components/tendik-stats";
import { toast } from "sonner";

type Row = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_kelamin: string | null;
  status_kepegawaian: string | null;
  golongan: string | null;
};

const STATUS_OPTIONS = ["PNS", "PPPK", "PTT", "PTY", "Honorer", "CPNS"];

type ImportRow = {
  id?: string | null;
  nama: string;
  nip: string | null;
  jenis_kelamin: string | null;
  status_kepegawaian: string | null;
  golongan: string | null;
};

export const Route = createFileRoute("/_authenticated/tendik")({
  head: () => ({ meta: [{ title: "Manajemen Tendik — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listTendik);
  const saveFn = useServerFn(saveTendik);
  const delFn = useServerFn(deleteTendik);
  const importFn = useServerFn(importTendik);
  const { data = [] } = useQuery({ queryKey: ["tendik"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace" | "upsert">("upsert");
  const fileRef = useRef<HTMLInputElement>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["tendik"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tendik"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const imp = useMutation({
    mutationFn: (v: { rows: ImportRow[]; mode: "append" | "replace" | "upsert" }) => importFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`Berhasil impor ${r.count} tendik${r.updated ? ` (${r.updated} diupdate, ${r.inserted} baru)` : ""}`);
      qc.invalidateQueries({ queryKey: ["tendik"] });
      setImportOpen(false);
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e.message),
  });

  const HEADERS = ["id", "nama", "nip", "jenis_kelamin", "status_kepegawaian", "golongan"];

  const downloadTemplate = (withData: boolean) => {
    const rows: any[][] = [HEADERS];
    if (withData && data.length > 0) {
      for (const r of data) {
        rows.push([
          r.id ?? "",
          r.nama ?? "",
          r.nip ?? "",
          r.jenis_kelamin ?? "",
          r.status_kepegawaian ?? "",
          r.golongan ?? "",
        ]);
      }
    } else {
      rows.push(["", "Ahmad Fauzi", "198601012011011001", "L", "PNS", "III/a"]);
      rows.push(["", "Dewi Lestari", "", "P", "PPPK", "III/b"]);
      rows.push(["", "Rizky Pratama", "", "L", "Honorer", ""]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tendik");
    XLSX.writeFile(wb, withData ? "data-tendik.xlsx" : "template-tendik.xlsx");
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      const pick = (r: any, keys: string[]) => {
        for (const k of keys) {
          const v = r[k] ?? r[k.toLowerCase()] ?? r[k.toUpperCase()];
          if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
        }
        return "";
      };
      const rows: ImportRow[] = json
        .map((r) => ({
          id: pick(r, ["id", "ID"]) || null,
          nama: pick(r, ["nama", "Nama"]),
          nip: pick(r, ["nip", "NIP"]) || null,
          jenis_kelamin: pick(r, ["jenis_kelamin", "Jenis Kelamin", "jk", "JK"]) || null,
          status_kepegawaian: pick(r, ["status_kepegawaian", "status", "Status Kepegawaian"]) || null,
          golongan: pick(r, ["golongan", "Golongan", "pangkat_golongan", "Pangkat/Golongan"]) || null,
        }))
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
    <div className="space-y-4">
      <TendikStats rows={data} />
      <CrudTable<Row>
        title="Manajemen Tendik"
        description="Data tenaga kependidikan (non-guru)."
        rows={data}
        search={(r, q) => `${r.nama ?? ""} ${r.nip ?? ""} ${r.status_kepegawaian ?? ""} ${r.golongan ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
          { header: "NIP", cell: (r) => <span className="font-mono text-xs">{r.nip ?? "—"}</span> },
          { header: "JK", cell: (r) => r.jenis_kelamin ?? "—" },
          { header: "Status", cell: (r) => r.status_kepegawaian ? <Badge variant="secondary">{r.status_kepegawaian}</Badge> : "—" },
          { header: "Golongan", cell: (r) => r.golongan ? <span className="font-mono text-xs">{r.golongan}</span> : "—" },
        ]}
        onAdd={() => setEditing({})}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
        extra={
          <>
            <Button variant="outline" onClick={() => downloadTemplate(true)}>
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </>
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Tendik</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Nama *</Label><Input value={editing.nama ?? ""} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>NIP</Label><Input value={editing.nip ?? ""} onChange={(e) => setEditing({ ...editing, nip: e.target.value })} /></div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select value={editing.jenis_kelamin ?? ""} onValueChange={(v) => setEditing({ ...editing, jenis_kelamin: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status Kepegawaian</Label>
                  <Select value={editing.status_kepegawaian ?? ""} onValueChange={(v) => setEditing({ ...editing, status_kepegawaian: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Golongan</Label><Input value={editing.golongan ?? ""} onChange={(e) => setEditing({ ...editing, golongan: e.target.value })} placeholder="III/a, IV/b" /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({
              id: editing?.id,
              nama: editing?.nama,
              nip: editing?.nip || null,
              jenis_kelamin: editing?.jenis_kelamin || null,
              status_kepegawaian: editing?.status_kepegawaian || null,
              golongan: editing?.golongan || null,
            })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); if (fileRef.current) fileRef.current.value = ""; } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Tendik</DialogTitle>
            <DialogDescription>
              Unduh data yang ada, edit secara offline (mis. Excel), lalu unggah kembali. Kolom <b>id</b> dipakai untuk update; kosongkan untuk baris baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadTemplate(true)}>
                <Download className="mr-2 h-4 w-4" /> Unduh Data Saat Ini
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate(false)}>
                <Download className="mr-2 h-4 w-4" /> Template Kosong
              </Button>
            </div>
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
                  <RadioGroupItem value="upsert" id="tm-upsert" />
                  <Label htmlFor="tm-upsert" className="font-normal">Update baris ber-<b>id</b>, tambah baris tanpa id (disarankan)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="tm-append" />
                  <Label htmlFor="tm-append" className="font-normal">Tambah semua sebagai baris baru</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="replace" id="tm-replace" />
                  <Label htmlFor="tm-replace" className="font-normal text-destructive">Ganti semua (hapus data lama)</Label>
                </div>
              </RadioGroup>
            </div>
            {importRows.length > 0 && (
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium mb-2">Preview: {importRows.length} baris siap diimpor</div>
                <div className="max-h-40 overflow-auto space-y-1 text-xs text-muted-foreground">
                  {importRows.slice(0, 10).map((r, i) => (
                    <div key={i}>
                      {r.id ? "✎ " : "+ "}{r.nama}
                      {r.nip ? ` — NIP ${r.nip}` : ""}
                      {r.status_kepegawaian ? ` — ${r.status_kepegawaian}` : ""}
                      {r.golongan ? ` (${r.golongan})` : ""}
                    </div>
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
    </div>
  );
}
