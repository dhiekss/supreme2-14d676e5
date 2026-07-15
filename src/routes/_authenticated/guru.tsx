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
import { listGuru, saveGuru, deleteGuru, listMapel, importGuru, listKonsentrasi } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_kelamin: string | null;
  mata_pelajaran_id: string | null;
  mapel_nama?: string;
  kelompok_mapel: string | null;
  kualifikasi_pendidikan: string | null;
  no_whatsapp: string | null;
  status_kepegawaian: string | null;
  pangkat_golongan: string | null;
  konsentrasi_keahlian_id: string | null;
  konsentrasi_nama?: string | null;
};

const STATUS_OPTIONS = ["PNS", "PPPK", "GTT", "GTY", "Honorer", "CPNS"];

// A mapel is "produktif" when its kelompok starts with "C" (C1/C2/C3), matching the SMK curriculum grouping.
const isProduktifKelompok = (k?: string | null) => !!k && k.trim().toUpperCase().startsWith("C");

type ImportRow = {
  id?: string | null;
  nama: string;
  nip: string | null;
  jenis_kelamin: string | null;
  mata_pelajaran_nama: string | null;
  kelompok_mapel: string | null;
  kualifikasi_pendidikan: string | null;
  no_whatsapp: string | null;
  status_kepegawaian: string | null;
  pangkat_golongan: string | null;
  konsentrasi_keahlian_nama: string | null;
};

export const Route = createFileRoute("/_authenticated/guru")({
  head: () => ({ meta: [{ title: "Manajemen Guru — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listGuru);
  const fetchMapel = useServerFn(listMapel);
  const saveFn = useServerFn(saveGuru);
  const delFn = useServerFn(deleteGuru);
  const importFn = useServerFn(importGuru);
  const fetchKons = useServerFn(listKonsentrasi);
  const { data = [] } = useQuery({ queryKey: ["guru"], queryFn: () => fetchFn() as Promise<Row[]> });
  const { data: mapel = [] } = useQuery({ queryKey: ["mapel"], queryFn: () => fetchMapel() as Promise<any[]> });
  const { data: konsentrasi = [] } = useQuery({ queryKey: ["konsentrasi"], queryFn: () => fetchKons() as Promise<any[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace" | "upsert">("upsert");
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedMapel = mapel.find((m: any) => m.id === editing?.mata_pelajaran_id);
  const editingIsProduktif = isProduktifKelompok(selectedMapel?.kelompok);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["guru"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["guru"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const imp = useMutation({
    mutationFn: (v: { rows: ImportRow[]; mode: "append" | "replace" | "upsert" }) => importFn({ data: v }),
    onSuccess: (r: any) => {
      toast.success(`Berhasil impor ${r.count} guru${r.updated ? ` (${r.updated} diupdate, ${r.inserted} baru)` : ""}`);
      qc.invalidateQueries({ queryKey: ["guru"] });
      setImportOpen(false);
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast.error(e.message),
  });

  const HEADERS = [
    "id", "nama", "nip", "jenis_kelamin", "mata_pelajaran_nama",
    "kelompok_mapel", "kualifikasi_pendidikan", "no_whatsapp",
    "status_kepegawaian", "pangkat_golongan", "konsentrasi_keahlian_nama",
  ];

  const downloadTemplate = (withData: boolean) => {
    const rows: any[][] = [HEADERS];
    if (withData && data.length > 0) {
      for (const r of data) {
        rows.push([
          r.id ?? "",
          r.nama ?? "",
          r.nip ?? "",
          r.jenis_kelamin ?? "",
          r.mapel_nama && r.mapel_nama !== "—" ? r.mapel_nama : "",
          r.kelompok_mapel ?? "",
          r.kualifikasi_pendidikan ?? "",
          r.no_whatsapp ?? "",
          r.status_kepegawaian ?? "",
          r.pangkat_golongan ?? "",
          r.konsentrasi_nama ?? "",
        ]);
      }
    } else {
      rows.push(["", "Budi Santoso", "198501012010011001", "L", "Matematika", "A", "S1", "081234567890", "PNS", "III/a", ""]);
      rows.push(["", "Siti Aminah", "", "P", "Bahasa Indonesia", "A", "S2", "", "PPPK", "III/b", ""]);
      rows.push(["", "Andi Wijaya", "", "L", "Pemrograman Web", "C3", "S1", "", "PPPK", "III/a", "Rekayasa Perangkat Lunak"]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = HEADERS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guru");
    XLSX.writeFile(wb, withData ? "data-guru.xlsx" : "template-guru.xlsx");
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
          mata_pelajaran_nama: pick(r, ["mata_pelajaran_nama", "mata_pelajaran", "mapel", "Mata Pelajaran"]) || null,
          kelompok_mapel: pick(r, ["kelompok_mapel", "kelompok", "Kelompok"]) || null,
          kualifikasi_pendidikan: pick(r, ["kualifikasi_pendidikan", "kualifikasi", "Kualifikasi"]) || null,
          no_whatsapp: pick(r, ["no_whatsapp", "whatsapp", "wa", "No WhatsApp"]) || null,
          status_kepegawaian: pick(r, ["status_kepegawaian", "status", "Status Kepegawaian"]) || null,
          pangkat_golongan: pick(r, ["pangkat_golongan", "pangkat", "golongan", "Pangkat/Golongan"]) || null,
          konsentrasi_keahlian_nama: pick(r, ["konsentrasi_keahlian_nama", "konsentrasi_keahlian", "konsentrasi", "Konsentrasi Keahlian"]) || null,
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
    <>
      <CrudTable<Row>
        title="Manajemen Guru"
        description="Data guru & tenaga pendidik."
        rows={data}
        search={(r, q) => `${r.nama ?? ""} ${r.nip ?? ""} ${r.mapel_nama ?? ""} ${r.status_kepegawaian ?? ""} ${r.pangkat_golongan ?? ""} ${r.konsentrasi_nama ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
          { header: "NIP", cell: (r) => <span className="font-mono text-xs">{r.nip ?? "—"}</span> },
          { header: "JK", cell: (r) => r.jenis_kelamin ?? "—" },
          { header: "Mata Pelajaran", cell: (r) => r.mapel_nama ?? "—" },
          { header: "Konsentrasi", cell: (r) => r.konsentrasi_nama ? <Badge variant="outline">{r.konsentrasi_nama}</Badge> : "—" },
          { header: "Status", cell: (r) => r.status_kepegawaian ? <Badge variant="secondary">{r.status_kepegawaian}</Badge> : "—" },
          { header: "Pangkat/Gol", cell: (r) => r.pangkat_golongan ? <span className="font-mono text-xs">{r.pangkat_golongan}</span> : "—" },
          { header: "Kualifikasi", cell: (r) => r.kualifikasi_pendidikan ? <Badge variant="outline">{r.kualifikasi_pendidikan}</Badge> : "—" },
          { header: "WhatsApp", cell: (r) => r.no_whatsapp ?? "—" },
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
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Guru</DialogTitle></DialogHeader>
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
              <div>
                <Label>Mata Pelajaran</Label>
                <Select
                  value={editing.mata_pelajaran_id ?? ""}
                  onValueChange={(v) => {
                    const m = mapel.find((x: any) => x.id === v);
                    const produktif = isProduktifKelompok(m?.kelompok);
                    setEditing({
                      ...editing,
                      mata_pelajaran_id: v,
                      kelompok_mapel: m?.kelompok ?? editing.kelompok_mapel ?? null,
                      // clear konsentrasi if mapel is not produktif
                      konsentrasi_keahlian_id: produktif ? editing.konsentrasi_keahlian_id ?? null : null,
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
                  <SelectContent>
                    {mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}{m.kelompok ? ` (${m.kelompok})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editingIsProduktif && (
                <div>
                  <Label>Konsentrasi Keahlian *</Label>
                  <Select
                    value={editing.konsentrasi_keahlian_id ?? ""}
                    onValueChange={(v) => setEditing({ ...editing, konsentrasi_keahlian_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pilih konsentrasi keahlian" /></SelectTrigger>
                    <SelectContent>
                      {konsentrasi.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Belum ada data konsentrasi keahlian.</div>
                      ) : (
                        konsentrasi.map((k: any) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Wajib untuk pengampu mata pelajaran produktif (kelompok C).</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kelompok Mapel</Label><Input value={editing.kelompok_mapel ?? ""} onChange={(e) => setEditing({ ...editing, kelompok_mapel: e.target.value })} /></div>
                <div><Label>Kualifikasi</Label><Input value={editing.kualifikasi_pendidikan ?? ""} onChange={(e) => setEditing({ ...editing, kualifikasi_pendidikan: e.target.value })} placeholder="S1 / S2" /></div>
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
                <div><Label>Pangkat/Golongan</Label><Input value={editing.pangkat_golongan ?? ""} onChange={(e) => setEditing({ ...editing, pangkat_golongan: e.target.value })} placeholder="III/a, IV/b" /></div>
              </div>
              <div><Label>No. WhatsApp</Label><Input value={editing.no_whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, no_whatsapp: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({
              id: editing?.id,
              nama: editing?.nama,
              nip: editing?.nip || null,
              jenis_kelamin: editing?.jenis_kelamin || null,
              mata_pelajaran_id: editing?.mata_pelajaran_id || null,
              kelompok_mapel: editing?.kelompok_mapel || null,
              kualifikasi_pendidikan: editing?.kualifikasi_pendidikan || null,
              no_whatsapp: editing?.no_whatsapp || null,
              status_kepegawaian: editing?.status_kepegawaian || null,
              pangkat_golongan: editing?.pangkat_golongan || null,
              konsentrasi_keahlian_id: editingIsProduktif ? (editing?.konsentrasi_keahlian_id || null) : null,
            })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { if (!o) { setImportOpen(false); setImportRows([]); if (fileRef.current) fileRef.current.value = ""; } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Guru</DialogTitle>
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
                  <RadioGroupItem value="upsert" id="m-upsert" />
                  <Label htmlFor="m-upsert" className="font-normal">Update baris ber-<b>id</b>, tambah baris tanpa id (disarankan)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="append" id="m-append" />
                  <Label htmlFor="m-append" className="font-normal">Tambah semua sebagai baris baru</Label>
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
                    <div key={i}>
                      {r.id ? "✎ " : "+ "}{r.nama}
                      {r.nip ? ` — NIP ${r.nip}` : ""}
                      {r.status_kepegawaian ? ` — ${r.status_kepegawaian}` : ""}
                      {r.pangkat_golongan ? ` (${r.pangkat_golongan})` : ""}
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
    </>
  );
}
