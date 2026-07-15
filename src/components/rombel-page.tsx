import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Users, Download, Upload, FileDown, FileText, UserPlus, Trash2, AlertTriangle, ChevronsUpDown, Check } from "lucide-react";
import { withDateSuffix } from "@/lib/utils";
import { listRombel, saveRombel, deleteRombel, deleteAllRombel, listGuru } from "@/lib/sekolah.functions";
import {
  listStudentsByRombel,
  listAllStudents,
  saveStudent,
  removeStudentFromRombel,
  bulkImportStudents,
  bulkImportRombel,
  importNisnToRombel,
} from "@/lib/rombel-members.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string | null;
  tingkat: string | null;
  konsentrasi_keahlian: string | null;
  wali_kelas_name: string | null;
  wali_kelas_nip: string | null;
  is_khusus: boolean | null;
};

type Student = {
  id: string;
  name: string | null;
  nis: string | null;
  nisn: string | null;
  gender: string | null;
};

function downloadXLSX(filename: string, rows: (string | number | null | undefined)[][]) {
  const aoa = rows.map((r) => r.map((c) => (c == null ? "" : c)));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const header = (rows[0] ?? []).map((h) => String(h ?? "").toLowerCase());
  // Force ID-like columns to TEXT so leading zeros / long digits aren't mangled
  const textCols = ["nisn", "nis", "wali_kelas_nip"]
    .map((k) => header.indexOf(k))
    .filter((i) => i >= 0);
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let R = 1; R <= range.e.r; R++) {
    for (const C of textCols) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && cell.v != null && cell.v !== "") {
        cell.t = "s";
        cell.v = String(cell.v);
        cell.z = "@";
      }
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, withDateSuffix(filename));
}

async function parseXLSX(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  // cellNF preserves number formats; we read each cell manually for max fidelity
  const wb = XLSX.read(buf, { type: "array", cellNF: true, cellText: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws["!ref"]) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]);

  // Detect header row (row 0) and which columns must stay as TEXT
  const TEXT_KEYS = new Set(["nisn", "nis", "wali_kelas_nip", "nip"]);
  const textCols = new Set<number>();
  for (let C = range.s.c; C <= range.e.c; C++) {
    const h = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
    const hv = h ? String(h.w ?? h.v ?? "").trim().toLowerCase() : "";
    if (TEXT_KEYS.has(hv)) textCols.add(C);
  }

  const rows: string[][] = [];
  for (let R = range.s.r; R <= range.e.r; R++) {
    const row: string[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      let val = "";
      if (cell && cell.v != null) {
        if (textCols.has(C) && typeof cell.v === "number") {
          // Force integer text: never scientific notation, never trailing .0
          val = Number.isFinite(cell.v)
            ? (Number.isInteger(cell.v) ? cell.v.toFixed(0) : String(cell.v))
            : "";
        } else if (cell.w != null) {
          val = String(cell.w);
        } else {
          val = String(cell.v);
        }
      }
      row.push(val.trim());
    }
    if (row.some((x) => x.length)) rows.push(row);
  }
  return rows;
}

export function RombelPage({ khusus = false }: { khusus?: boolean }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listRombel);
  const saveFn = useServerFn(saveRombel);
  const delFn = useServerFn(deleteRombel);
  const delAllFn = useServerFn(deleteAllRombel);
  const allStudentsFn = useServerFn(listAllStudents);
  const bulkStudentsFn = useServerFn(bulkImportStudents);
  const bulkRombelFn = useServerFn(bulkImportRombel);
  const importNisnFn = useServerFn(importNisnToRombel);
  const guruFn = useServerFn(listGuru);

  const { data = [] } = useQuery({
    queryKey: ["rombel", khusus],
    queryFn: () => fetchFn({ data: { khusus } }) as Promise<Row[]>,
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ["all-students-for-rombel-counts"],
    queryFn: () => allStudentsFn({}) as Promise<Array<{ rombel_id: string | null; gender: string | null }>>,
  });

  const countsByRombel = useMemo(() => {
    const m = new Map<string, { total: number; L: number; P: number; belum: number }>();
    for (const s of allStudents) {
      if (!s.rombel_id) continue;
      const c = m.get(s.rombel_id) ?? { total: 0, L: 0, P: 0, belum: 0 };
      c.total += 1;
      if (s.gender === "L") c.L += 1;
      else if (s.gender === "P") c.P += 1;
      else c.belum += 1;
      m.set(s.rombel_id, c);
    }
    return m;
  }, [allStudents]);

  const { data: guruList = [] } = useQuery({
    queryKey: ["guru-lite-for-wali"],
    queryFn: () => guruFn() as Promise<Array<{ id: string; nama: string; nip: string | null }>>,
  });

  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [membersOf, setMembersOf] = useState<Row | null>(null);
  const [confirmDelAll, setConfirmDelAll] = useState(false);
  const [importNisnFor, setImportNisnFor] = useState<string>("");
  const fileInputs = {
    nisn: useRef<HTMLInputElement>(null),
    murid: useRef<HTMLInputElement>(null),
    rombel: useRef<HTMLInputElement>(null),
  };

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["rombel"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["rombel"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const delAll = useMutation({
    mutationFn: () => delAllFn({ data: { khusus } }),
    onSuccess: (r: any) => {
      toast.success(`${r?.count ?? 0} rombel dihapus`);
      qc.invalidateQueries({ queryKey: ["rombel"] });
      setConfirmDelAll(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleExportRombel() {
    // Hitung jumlah murid per rombel (L, P, dan yang belum diisi gendernya)
    const all = (await allStudentsFn({})) as any[];
    const counts = new Map<string, { total: number; L: number; P: number; belum: number }>();
    for (const s of all) {
      const key = String(s.rombel_nama ?? "").trim();
      if (!key) continue;
      const c = counts.get(key) ?? { total: 0, L: 0, P: 0, belum: 0 };
      c.total += 1;
      if (s.gender === "L") c.L += 1;
      else if (s.gender === "P") c.P += 1;
      else c.belum += 1;
      counts.set(key, c);
    }
    const rows: any[][] = [[
      "Nama Rombel", "Konsentrasi Keahlian", "Jumlah Murid",
      "Laki-laki", "Perempuan", "Belum Diisi", "Wali Kelas", "NIP Wali Kelas",
    ]];
    // Urutkan berdasarkan nama rombel supaya rapi
    const sorted = [...data].sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    sorted.forEach((r) => {
      const c = counts.get(String(r.name ?? "").trim()) ?? { total: 0, L: 0, P: 0, belum: 0 };
      rows.push([
        r.name ?? "",
        r.konsentrasi_keahlian ?? "",
        c.total,
        c.L > 0 ? c.L : "-",
        c.P > 0 ? c.P : "-",
        c.belum > 0 ? c.belum : "-",
        r.wali_kelas_name ?? "",
        r.wali_kelas_nip ?? "",
      ]);
    });
    downloadXLSX("rombel.xlsx", rows);
  }

  async function handleExportMurid() {
    const all = (await allStudentsFn({})) as any[];
    // Urutkan berdasarkan Rombel, lalu Nama Murid
    const sorted = [...all].sort((a, b) => {
      const ra = String(a.rombel_nama ?? "").localeCompare(String(b.rombel_nama ?? ""));
      if (ra !== 0) return ra;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
    const rows: any[][] = [["No", "Nama Murid", "JK", "NIS", "NISN", "Rombel", "Nama Wali Kelas"]];
    sorted.forEach((s, i) => rows.push([
      i + 1,
      s.name ?? "",
      s.gender === "L" ? "Laki-laki" : s.gender === "P" ? "Perempuan" : "",
      s.nis ?? "",
      s.nisn ?? "",
      s.rombel_nama ?? "",
      s.wali_kelas_name ?? "",
    ]));
    downloadXLSX("daftar-murid.xlsx", rows);
  }

  function handleTemplateNisn() {
    downloadXLSX("template-nisn.xlsx", [["nisn"], ["1234567890"], ["0987654321"]]);
  }

  function handleTemplateMurid() {
    downloadXLSX("template-bulk-murid.xlsx", [
      ["name", "nis", "nisn", "gender", "rombel_name"],
      ["Budi Santoso", "12345", "1234567890", "L", "X TKJ 1"],
      ["Siti Aminah", "12346", "1234567891", "P", "X TKJ 1"],
    ]);
  }

  function handleTemplateRombel() {
    downloadXLSX("template-import-rombel.xlsx", [
      ["name", "tingkat", "konsentrasi_keahlian", "wali_kelas_name", "wali_kelas_nip", "is_khusus"],
      ["X TKJ 1", "X", "Teknik Komputer dan Jaringan", "Ahmad Fauzi", "198501012010011001", "false"],
      ["XI RPL 2", "XI", "Rekayasa Perangkat Lunak", "Dewi Lestari", "198702022011012002", "false"],
    ]);
  }

  async function handleFile(kind: "nisn" | "murid" | "rombel", f: File) {
    const parsed = await parseXLSX(f);
    if (!parsed.length) { toast.error("File kosong"); return; }
    const [header, ...body] = parsed;
    const idx = (k: string) => header.findIndex((h: string) => h.trim().toLowerCase() === k);


    try {
      if (kind === "nisn") {
        if (!importNisnFor) { toast.error("Pilih rombel tujuan dulu"); return; }
        const ci = idx("nisn");
        if (ci < 0) { toast.error("Kolom 'nisn' tidak ditemukan"); return; }
        const nisns = body.map((r: string[]) => r[ci]?.trim()).filter(Boolean) as string[];
        const res = (await importNisnFn({ data: { rombel_id: importNisnFor, nisns } })) as any;
        toast.success(`${res.count} murid dipindahkan`);
      } else if (kind === "murid") {
        const map = { name: idx("name"), nis: idx("nis"), nisn: idx("nisn"), gender: idx("gender"), rombel_name: idx("rombel_name") };
        if (map.name < 0) { toast.error("Kolom 'name' wajib ada"); return; }
        const rows = body.map((r: string[]) => ({
          name: r[map.name]?.trim() ?? "",
          nis: map.nis >= 0 ? r[map.nis]?.trim() || null : null,
          nisn: map.nisn >= 0 ? r[map.nisn]?.trim() || null : null,
          gender: map.gender >= 0 ? r[map.gender]?.trim() || null : null,
          rombel_name: map.rombel_name >= 0 ? r[map.rombel_name]?.trim() || null : null,
        })).filter((x: { name: string }) => x.name);
        const res = (await bulkStudentsFn({ data: { rows } })) as any;
        toast.success(`${res.count} murid diimpor`);
      } else if (kind === "rombel") {
        const map = {
          name: idx("name"), tingkat: idx("tingkat"), konsentrasi_keahlian: idx("konsentrasi_keahlian"),
          wali_kelas_name: idx("wali_kelas_name"), wali_kelas_nip: idx("wali_kelas_nip"), is_khusus: idx("is_khusus"),
        };
        if (map.name < 0) { toast.error("Kolom 'name' wajib ada"); return; }
        const rows = body.map((r: string[]) => ({
          name: r[map.name]?.trim() ?? "",
          tingkat: map.tingkat >= 0 ? r[map.tingkat]?.trim() || null : null,
          konsentrasi_keahlian: map.konsentrasi_keahlian >= 0 ? r[map.konsentrasi_keahlian]?.trim() || null : null,
          wali_kelas_name: map.wali_kelas_name >= 0 ? r[map.wali_kelas_name]?.trim() || null : null,
          wali_kelas_nip: map.wali_kelas_nip >= 0 ? r[map.wali_kelas_nip]?.trim() || null : null,
          is_khusus: map.is_khusus >= 0 ? /^(true|1|ya)$/i.test(r[map.is_khusus]?.trim() ?? "") : false,
        })).filter((x: { name: string }) => x.name);
        const res = (await bulkRombelFn({ data: { rows } })) as any;
        toast.success(`${res.count} rombel diimpor`);
        qc.invalidateQueries({ queryKey: ["rombel"] });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal impor");
    }
  }

  return (
    <>
      <input ref={fileInputs.nisn} type="file" accept=".xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && handleFile("nisn", e.target.files[0]).then(() => (e.target.value = ""))} />
      <input ref={fileInputs.murid} type="file" accept=".xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && handleFile("murid", e.target.files[0]).then(() => (e.target.value = ""))} />
      <input ref={fileInputs.rombel} type="file" accept=".xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && handleFile("rombel", e.target.files[0]).then(() => (e.target.value = ""))} />

      <CrudTable<Row>
        title={khusus ? "Rombel Khusus" : "Manajemen Rombel"}
        description={khusus ? "Rombel khusus / kelompok belajar." : "Kelola rombongan belajar (kelas)."}
        rows={data}
        search={(r, q) => `${r.name ?? ""} ${r.tingkat ?? ""} ${r.konsentrasi_keahlian ?? ""} ${r.wali_kelas_name ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Nama Rombel", cell: (r) => <span className="font-medium">{r.name}</span> },
          { header: "Tingkat", cell: (r) => r.tingkat ?? "—" },
          { header: "Konsentrasi", cell: (r) => r.konsentrasi_keahlian ?? "—" },
          { header: "Wali Kelas", cell: (r) => <WaliKelasPicker row={r} guruList={guruList} /> },
          { header: "NIP", cell: (r) => <span className="tabular-nums text-sm">{r.wali_kelas_nip ?? "—"}</span> },
          { header: "Tipe", cell: (r) => r.is_khusus ? <Badge variant="secondary">Khusus</Badge> : <Badge variant="outline">Reguler</Badge> },
          { header: "Anggota", cell: (r) => (
            <Button size="sm" variant="outline" onClick={() => setMembersOf(r)}>
              <Users className="h-4 w-4 mr-1" /> Lihat
            </Button>
          )},
        ]}
        onAdd={() => setEditing({ is_khusus: khusus })}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
        addLabel="Tambah Rombel"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExportRombel}><Download className="h-4 w-4 mr-1" />Export Rombel</Button>
            <Button size="sm" variant="outline" onClick={handleExportMurid}><Download className="h-4 w-4 mr-1" />Export Daftar Murid</Button>
            <Button size="sm" variant="outline" onClick={handleTemplateNisn}><FileText className="h-4 w-4 mr-1" />Template NISN</Button>
            <div className="flex items-center gap-1">
              <Select value={importNisnFor} onValueChange={setImportNisnFor}>
                <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>{data.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => fileInputs.nisn.current?.click()}><Upload className="h-4 w-4 mr-1" />Import NISN</Button>
            </div>
            <Button size="sm" variant="outline" onClick={handleTemplateMurid}><FileText className="h-4 w-4 mr-1" />Template Murid</Button>
            <Button size="sm" variant="outline" onClick={() => fileInputs.murid.current?.click()}><FileDown className="h-4 w-4 mr-1" />Bulk Import Murid</Button>
            <Button size="sm" variant="outline" onClick={handleTemplateRombel}><FileText className="h-4 w-4 mr-1" />Template Rombel</Button>
            <Button size="sm" variant="outline" onClick={() => fileInputs.rombel.current?.click()}><Upload className="h-4 w-4 mr-1" />Import Rombel</Button>
            <Button size="sm" variant="destructive" onClick={() => setConfirmDelAll(true)} disabled={data.length === 0}>
              <Trash2 className="h-4 w-4 mr-1" />Hapus Semua
            </Button>
          </div>
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Rombel" : "Tambah Rombel"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Nama Rombel *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tingkat</Label><Input value={editing.tingkat ?? ""} onChange={(e) => setEditing({ ...editing, tingkat: e.target.value })} placeholder="X / XI / XII" /></div>
                <div><Label>Konsentrasi Keahlian</Label><Input value={editing.konsentrasi_keahlian ?? ""} onChange={(e) => setEditing({ ...editing, konsentrasi_keahlian: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Wali Kelas</Label><Input value={editing.wali_kelas_name ?? ""} onChange={(e) => setEditing({ ...editing, wali_kelas_name: e.target.value })} /></div>
                <div><Label>NIP Wali</Label><Input value={editing.wali_kelas_nip ?? ""} onChange={(e) => setEditing({ ...editing, wali_kelas_nip: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_khusus} onCheckedChange={(v) => setEditing({ ...editing, is_khusus: v })} />
                <Label>Rombel Khusus</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button
              disabled={save.isPending || !editing?.name}
              onClick={() => save.mutate({
                id: editing?.id,
                name: editing?.name,
                tingkat: editing?.tingkat || null,
                konsentrasi_keahlian: editing?.konsentrasi_keahlian || null,
                wali_kelas_name: editing?.wali_kelas_name || null,
                wali_kelas_nip: editing?.wali_kelas_nip || null,
                is_khusus: !!editing?.is_khusus,
              })}
            >Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MembersDialog rombel={membersOf} onClose={() => setMembersOf(null)} />

      <AlertDialog open={confirmDelAll} onOpenChange={setConfirmDelAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Hapus semua rombel?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>{data.length}</strong> rombel{khusus ? " khusus" : " reguler"} beserta relasi anggotanya. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delAll.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={delAll.isPending}
              onClick={(e) => { e.preventDefault(); delAll.mutate(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {delAll.isPending ? "Menghapus…" : "Hapus Semua"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MembersDialog({ rombel, onClose }: { rombel: Row | null; onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudentsByRombel);
  const saveFn = useServerFn(saveStudent);
  const removeFn = useServerFn(removeStudentFromRombel);
  const open = !!rombel;
  const [adding, setAdding] = useState<Partial<Student> | null>(null);

  const { data: students = [] } = useQuery({
    queryKey: ["rombel-members", rombel?.id],
    queryFn: () => listFn({ data: { rombel_id: rombel!.id } }) as Promise<Student[]>,
    enabled: open,
  });

  const addMut = useMutation({
    mutationFn: (v: any) => saveFn({ data: { ...v, rombel_id: rombel!.id } }),
    onSuccess: () => {
      toast.success("Murid ditambahkan");
      qc.invalidateQueries({ queryKey: ["rombel-members", rombel?.id] });
      setAdding(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dikeluarkan dari rombel");
      qc.invalidateQueries({ queryKey: ["rombel-members", rombel?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Anggota Rombel — {rombel?.name}</DialogTitle>
          <DialogDescription>Kelola murid di rombel ini.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => setAdding({})}><UserPlus className="h-4 w-4 mr-1" />Tambah Murid</Button>
        </div>

        <div className="rounded-md border max-h-[50vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Nama</th>
                <th className="text-left p-2">NIS</th>
                <th className="text-left p-2">NISN</th>
                <th className="text-left p-2">L/P</th>
                <th className="text-right p-2 w-20">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Belum ada anggota</td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{s.nis ?? "—"}</td>
                  <td className="p-2">{s.nisn ?? "—"}</td>
                  <td className="p-2">{s.gender ?? "—"}</td>
                  <td className="p-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => removeMut.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {adding && (
          <div className="grid gap-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama *</Label><Input value={adding.name ?? ""} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></div>
              <div>
                <Label>L/P</Label>
                <Select value={adding.gender ?? ""} onValueChange={(v) => setAdding({ ...adding, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>NIS</Label><Input value={adding.nis ?? ""} onChange={(e) => setAdding({ ...adding, nis: e.target.value })} /></div>
              <div><Label>NISN</Label><Input value={adding.nisn ?? ""} onChange={(e) => setAdding({ ...adding, nisn: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdding(null)}>Batal</Button>
              <Button
                disabled={!adding.name || addMut.isPending}
                onClick={() => addMut.mutate({
                  name: adding.name,
                  nis: adding.nis || null,
                  nisn: adding.nisn || null,
                  gender: adding.gender || null,
                })}
              >Simpan</Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WaliKelasPicker({
  row,
  guruList,
}: {
  row: Row;
  guruList: Array<{ id: string; nama: string; nip: string | null }>;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveRombel);
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: (g: { nama: string | null; nip: string | null }) =>
      saveFn({
        data: {
          id: row.id,
          name: row.name,
          tingkat: row.tingkat || null,
          konsentrasi_keahlian: row.konsentrasi_keahlian || null,
          wali_kelas_name: g.nama,
          wali_kelas_nip: g.nip,
          is_khusus: !!row.is_khusus,
        },
      }),
    onSuccess: () => {
      toast.success("Wali kelas diperbarui");
      qc.invalidateQueries({ queryKey: ["rombel"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          disabled={m.isPending}
          className="h-8 justify-between font-normal min-w-[180px] max-w-[240px]"
        >
          <span className="truncate">
            {row.wali_kelas_name || <span className="text-muted-foreground">Pilih guru…</span>}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px]" align="start">
        <Command
          filter={(value, search) => {
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Cari nama / NIP guru…" />
          <CommandList>
            <CommandEmpty>Guru tidak ditemukan</CommandEmpty>
            <CommandGroup>
              {row.wali_kelas_name && (
                <CommandItem
                  value="__clear__ kosongkan hapus"
                  onSelect={() => {
                    m.mutate({ nama: null, nip: null });
                    setOpen(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
                  <span className="text-muted-foreground">Kosongkan</span>
                </CommandItem>
              )}
              {guruList.map((g) => {
                const selected = row.wali_kelas_name === g.nama;
                return (
                  <CommandItem
                    key={g.id}
                    value={`${g.nama} ${g.nip ?? ""}`}
                    onSelect={() => {
                      m.mutate({ nama: g.nama, nip: g.nip ?? null });
                      setOpen(false);
                    }}
                  >
                    <Check className={`h-3.5 w-3.5 mr-2 ${selected ? "opacity-100" : "opacity-0"}`} />
                    <div className="flex flex-col">
                      <span className="text-sm">{g.nama}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{g.nip ?? "—"}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
