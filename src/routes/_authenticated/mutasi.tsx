import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, Loader2, Eye, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listRombelTransfers, upsertRombelTransfer, deleteRombelTransfer,
  listResignations, upsertResignation, deleteResignation,
  listTransfersOut, upsertTransferOut, deleteTransferOut,
  listTransfersIn, upsertTransferIn, deleteTransferIn,
  listStudentsForMutasi, listRombelForMutasi, mutasiSummary,
} from "@/lib/mutasi.functions";

export const Route = createFileRoute("/_authenticated/mutasi")({
  head: () => ({ meta: [{ title: "Mutasi Murid — SUPREME XPOES" }] }),
  component: MutasiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const ALASAN_RESIGN = [
  "Ekonomi",
  "Menikah",
  "Bekerja",
  "Sakit",
  "Pindah Domisili",
  "Tidak Berminat Melanjutkan",
  "Lainnya",
];

// ---------- shared hooks ----------
function useCurrentEmail() {
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  return email;
}

async function uploadMutasiFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("mutasi").upload(key, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return key;
}

function FileUploadField({
  value, onChange, disabled,
}: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-1">
      <Input
        type="file"
        disabled={disabled || uploading}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            setUploading(true);
            const key = await uploadMutasiFile(f);
            onChange(key);
            toast.success("File terunggah");
          } catch (err: any) {
            toast.error(err.message ?? "Gagal upload");
          } finally {
            setUploading(false);
          }
        }}
      />
      {uploading && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Mengunggah…</div>}
      {value && !uploading && <div className="text-xs text-muted-foreground truncate">Tersimpan: {value}</div>}
    </div>
  );
}

function DiinputOleh({ email }: { email: string }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
      Diinput oleh: <span className="font-medium text-foreground">{email || "—"}</span>
    </div>
  );
}

// ---------- shared table helpers ----------
type SortDir = "asc" | "desc" | null;
function SortTh({
  label, field, sort, setSort, className,
}: { label: string; field: string; sort: { field: string; dir: SortDir }; setSort: (s: any) => void; className?: string }) {
  const active = sort.field === field && sort.dir;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground text-muted-foreground font-medium"
        onClick={() => {
          if (sort.field !== field) setSort({ field, dir: "asc" });
          else if (sort.dir === "asc") setSort({ field, dir: "desc" });
          else setSort({ field: "", dir: null });
        }}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

function useSortedRows<T extends Record<string, any>>(rows: T[], sort: { field: string; dir: SortDir }, getters: Record<string, (r: T) => any>) {
  return useMemo(() => {
    if (!sort.field || !sort.dir) return rows;
    const get = getters[sort.field] ?? ((r: any) => r[sort.field]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = get(a); const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sort, getters]);
}

function DapodikSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const v = (value ?? "belum").toLowerCase() === "sudah" ? "sudah" : "belum";
  const isSudah = v === "sudah";
  return (
    <Select value={v} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`h-8 w-[110px] rounded-full border ${
          isSudah
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
        }`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="belum">Belum</SelectItem>
        <SelectItem value="sudah">Sudah</SelectItem>
      </SelectContent>
    </Select>
  );
}

function DapodikDate({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Input
      type="date"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-[150px] rounded-full text-xs"
    />
  );
}

function RombelPill({ name }: { name?: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium">
      {name}
    </span>
  );
}

function fmtDateID(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}


// ============ Page ============
function MutasiPage() {
  const qc = useQueryClient();
  const sumFn = useServerFn(mutasiSummary);
  const { data: sum } = useQuery({ queryKey: ["mutasi-sum"], queryFn: () => sumFn() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["mutasi-rombel"] });
    qc.invalidateQueries({ queryKey: ["mutasi-resign"] });
    qc.invalidateQueries({ queryKey: ["mutasi-out"] });
    qc.invalidateQueries({ queryKey: ["mutasi-sum"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Mutasi Murid</h1>
          <p className="text-sm text-muted-foreground">Pindah rombel, resign, dan pindah sekolah</p>
        </div>
        <Button variant="outline" onClick={invalidate}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SumCard title="Pindah Rombel" value={sum?.rombel ?? 0} tone="text-primary" />
        <SumCard title="Resign / Keluar" value={sum?.resign ?? 0} tone="text-orange-700" />
        <SumCard title="Pindah Sekolah" value={sum?.out ?? 0} tone="text-blue-700" />
      </div>

      <Tabs defaultValue="rombel">
        <TabsList>
          <TabsTrigger value="rombel">Pindah Rombel</TabsTrigger>
          <TabsTrigger value="resign">Resign</TabsTrigger>
          <TabsTrigger value="out">Pindah Sekolah</TabsTrigger>
        </TabsList>
        <TabsContent value="rombel"><RombelTransferTab onChange={invalidate} /></TabsContent>
        <TabsContent value="resign"><ResignTab onChange={invalidate} /></TabsContent>
        <TabsContent value="out"><TransferOutTab onChange={invalidate} /></TabsContent>
      </Tabs>
    </div>
  );
}

function SumCard({ title, value, tone }: { title: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div></CardContent>
    </Card>
  );
}

// ============ Pindah Rombel ============
function RombelTransferTab({ onChange }: { onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: "", dir: null });
  const listFn = useServerFn(listRombelTransfers);
  const delFn = useServerFn(deleteRombelTransfer);
  const saveFn = useServerFn(upsertRombelTransfer);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-rombel", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const inlineUpdate = useMutation({
    mutationFn: (payload: { row: any; patch: any }) =>
      saveFn({ data: {
        id: payload.row.id,
        student_id: payload.row.student_id,
        rombel_asal_id: payload.row.rombel_asal_id,
        rombel_tujuan_id: payload.row.rombel_tujuan_id,
        tanggal_pindah: payload.row.tanggal_pindah,
        alasan: payload.row.alasan,
        ...payload.patch,
      } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutasi-rombel"] }); qc.invalidateQueries({ queryKey: ["mutasi-sum"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = useSortedRows(data as any[], sort, {
    nama: (r) => r.students?.name ?? "",
    nis: (r) => r.students?.nis ?? "",
    rombel_asal: (r) => r.asal?.name ?? "",
    rombel_tujuan: (r) => r.tujuan?.name ?? "",
    tanggal_pindah: (r) => r.tanggal_pindah ?? "",
    dapodik_status: (r) => (r.dapodik_status ?? "belum"),
    dapodik_tanggal: (r) => r.dapodik_tanggal ?? "",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortTh label="Nama Murid" field="nama" sort={sort} setSort={setSort} />
              <SortTh label="NIS" field="nis" sort={sort} setSort={setSort} />
              <SortTh label="Rombel Asal" field="rombel_asal" sort={sort} setSort={setSort} />
              <SortTh label="Rombel Tujuan" field="rombel_tujuan" sort={sort} setSort={setSort} />
              <SortTh label="Tanggal Pindah" field="tanggal_pindah" sort={sort} setSort={setSort} />
              <SortTh label="Proses Dapodik" field="dapodik_status" sort={sort} setSort={setSort} />
              <SortTh label="Tgl Proses Dapodik" field="dapodik_tanggal" sort={sort} setSort={setSort} />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {sorted.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.students?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.students?.nis ?? "—"}</TableCell>
                <TableCell><RombelPill name={r.asal?.name} /></TableCell>
                <TableCell><RombelPill name={r.tujuan?.name} /></TableCell>
                <TableCell className="text-sm">{fmtDateID(r.tanggal_pindah)}</TableCell>
                <TableCell>
                  <DapodikSelect
                    value={r.dapodik_status}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_status: v } })}
                  />
                </TableCell>
                <TableCell>
                  <DapodikDate
                    value={r.dapodik_tanggal}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_tanggal: v } })}
                  />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Eye className="h-4 w-4 text-primary" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {open && <RombelDialog open={open} setOpen={setOpen} row={editRow} onSaved={() => { setOpen(false); onChange(); }} />}
    </Card>
  );
}


function RombelDialog({ open, setOpen, row, onSaved }: any) {
  const email = useCurrentEmail();
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertRombelTransfer);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    student_nis: row?.students?.nis ?? "",
    rombel_asal_id: row?.rombel_asal_id ?? "",
    rombel_tujuan_id: row?.rombel_tujuan_id ?? "",
    tanggal_pindah: row?.tanggal_pindah ?? new Date().toISOString().slice(0, 10),
    alasan: row?.alasan ?? "",
  });
  const filteredStudents = useMemo(
    () => (f.rombel_asal_id ? students.filter((s: any) => s.rombel_id === f.rombel_asal_id) : []),
    [students, f.rombel_asal_id],
  );
  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      id: row?.id,
      student_id: f.student_id,
      rombel_asal_id: f.rombel_asal_id,
      rombel_tujuan_id: f.rombel_tujuan_id,
      tanggal_pindah: f.tanggal_pindah,
      alasan: f.alasan,
    } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Form Pindah Rombel</DialogTitle>
          <DialogDescription>Murid yang dipindah akan otomatis masuk ke rombel tujuan</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Rombel Asal <span className="text-destructive">*</span></Label>
            <Select value={f.rombel_asal_id} onValueChange={(v) => setF({ ...f, rombel_asal_id: v, student_id: "", student_nis: "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel asal" /></SelectTrigger>
              <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Murid <span className="text-destructive">*</span></Label>
            <Select
              value={f.student_id}
              onValueChange={(v) => {
                const s: any = filteredStudents.find((x: any) => x.id === v);
                setF({ ...f, student_id: v, student_nis: s?.nis ?? "" });
              }}
              disabled={!f.rombel_asal_id}
            >
              <SelectTrigger><SelectValue placeholder={f.rombel_asal_id ? "Pilih murid" : "Pilih rombel terlebih dahulu"} /></SelectTrigger>
              <SelectContent>{filteredStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>NIS</Label>
            <Input value={f.student_nis} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Rombel Tujuan <span className="text-destructive">*</span></Label>
            <Select value={f.rombel_tujuan_id} onValueChange={(v) => setF({ ...f, rombel_tujuan_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel tujuan" /></SelectTrigger>
              <SelectContent>{rombels.filter((r: any) => r.id !== f.rombel_asal_id).map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal Pindah Rombel <span className="text-destructive">*</span></Label>
            <Input type="date" value={f.tanggal_pindah} onChange={(e) => setF({ ...f, tanggal_pindah: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Alasan Pindah Rombel <span className="text-destructive">*</span></Label>
            <Textarea placeholder="Masukkan alasan pindah rombel" value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} />
          </div>
          <div className="md:col-span-2"><DiinputOleh email={email} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!f.student_id || !f.rombel_asal_id || !f.rombel_tujuan_id || !f.tanggal_pindah || !f.alasan || save.isPending}
          >
            Simpan Data Pindah Rombel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Resign ============
function ResignTab({ onChange }: { onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: "", dir: null });
  const listFn = useServerFn(listResignations);
  const delFn = useServerFn(deleteResignation);
  const saveFn = useServerFn(upsertResignation);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-resign", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const inlineUpdate = useMutation({
    mutationFn: (payload: { row: any; patch: any }) =>
      saveFn({ data: {
        id: payload.row.id,
        student_id: payload.row.student_id,
        rombel_id: payload.row.rombel_id,
        student_name: payload.row.student_name,
        student_nis: payload.row.student_nis,
        tanggal_surat: payload.row.tanggal_surat,
        alasan: payload.row.alasan,
        file_surat: payload.row.file_surat,
        ...payload.patch,
      } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutasi-resign"] }); qc.invalidateQueries({ queryKey: ["mutasi-sum"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = useSortedRows(data as any[], sort, {
    nama: (r) => r.students?.name ?? r.student_name ?? "",
    nis: (r) => r.students?.nis ?? r.student_nis ?? "",
    rombel_asal: (r) => r.rombel?.name ?? "",
    alasan: (r) => r.alasan ?? "",
    tanggal_surat: (r) => r.tanggal_surat ?? "",
    dapodik_status: (r) => (r.dapodik_status ?? "belum"),
    dapodik_tanggal: (r) => r.dapodik_tanggal ?? "",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS / alasan…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortTh label="Nama Murid" field="nama" sort={sort} setSort={setSort} />
              <SortTh label="NIS" field="nis" sort={sort} setSort={setSort} />
              <SortTh label="Rombel Asal" field="rombel_asal" sort={sort} setSort={setSort} />
              <SortTh label="Alasan" field="alasan" sort={sort} setSort={setSort} />
              <SortTh label="Tgl Surat" field="tanggal_surat" sort={sort} setSort={setSort} />
              <SortTh label="Proses Dapodik" field="dapodik_status" sort={sort} setSort={setSort} />
              <SortTh label="Tgl Proses Dapodik" field="dapodik_tanggal" sort={sort} setSort={setSort} />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {sorted.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.students?.name ?? r.student_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.students?.nis ?? r.student_nis ?? "—"}</TableCell>
                <TableCell><RombelPill name={r.rombel?.name} /></TableCell>
                <TableCell className="max-w-xs truncate">{r.alasan ?? "—"}</TableCell>
                <TableCell className="text-sm">{fmtDateID(r.tanggal_surat)}</TableCell>
                <TableCell>
                  <DapodikSelect
                    value={r.dapodik_status}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_status: v } })}
                  />
                </TableCell>
                <TableCell>
                  <DapodikDate
                    value={r.dapodik_tanggal}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_tanggal: v } })}
                  />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Eye className="h-4 w-4 text-primary" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {open && <ResignDialog open={open} setOpen={setOpen} row={editRow} onSaved={() => { setOpen(false); onChange(); }} />}
    </Card>
  );
}


function ResignDialog({ open, setOpen, row, onSaved }: any) {
  const email = useCurrentEmail();
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertResignation);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    rombel_id: row?.rombel_id ?? "",
    student_name: row?.student_name ?? row?.students?.name ?? "",
    student_nis: row?.student_nis ?? row?.students?.nis ?? "",
    tanggal_surat: row?.tanggal_surat ?? new Date().toISOString().slice(0, 10),
    alasan: row?.alasan ?? "",
    file_surat: row?.file_surat ?? "",
  });
  const filteredStudents = useMemo(
    () => (f.rombel_id ? students.filter((s: any) => s.rombel_id === f.rombel_id) : []),
    [students, f.rombel_id],
  );
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: row?.id, ...f } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Form Pengunduran Diri</DialogTitle>
          <DialogDescription>Murid yang dicatat akan otomatis dikeluarkan dari rombel</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Rombel <span className="text-destructive">*</span></Label>
            <Select value={f.rombel_id} onValueChange={(v) => setF({ ...f, rombel_id: v, student_id: "", student_name: "", student_nis: "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Murid <span className="text-destructive">*</span></Label>
            <Select
              value={f.student_id}
              onValueChange={(v) => {
                const s: any = filteredStudents.find((x: any) => x.id === v);
                setF({ ...f, student_id: v, student_name: s?.name ?? "", student_nis: s?.nis ?? "" });
              }}
              disabled={!f.rombel_id}
            >
              <SelectTrigger><SelectValue placeholder={f.rombel_id ? "Pilih murid" : "Pilih rombel terlebih dahulu"} /></SelectTrigger>
              <SelectContent>{filteredStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>NIS</Label>
            <Input value={f.student_nis} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Alasan <span className="text-destructive">*</span></Label>
            <Select value={f.alasan} onValueChange={(v) => setF({ ...f, alasan: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
              <SelectContent>{ALASAN_RESIGN.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tanggal Pada Surat <span className="text-destructive">*</span></Label>
            <Input type="date" value={f.tanggal_surat} onChange={(e) => setF({ ...f, tanggal_surat: e.target.value })} />
          </div>
          <div>
            <Label>Upload File Surat</Label>
            <FileUploadField value={f.file_surat} onChange={(v) => setF({ ...f, file_surat: v })} />
          </div>
          <div className="md:col-span-2"><DiinputOleh email={email} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!f.student_id || !f.rombel_id || !f.alasan || !f.tanggal_surat || save.isPending}
          >
            Simpan Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Transfer Out ============
function TransferOutTab({ onChange }: { onChange: () => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: "", dir: null });
  const listFn = useServerFn(listTransfersOut);
  const delFn = useServerFn(deleteTransferOut);
  const saveFn = useServerFn(upsertTransferOut);
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-out", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const inlineUpdate = useMutation({
    mutationFn: (payload: { row: any; patch: any }) =>
      saveFn({ data: {
        id: payload.row.id,
        student_id: payload.row.student_id,
        rombel_id: payload.row.rombel_id,
        student_name: payload.row.student_name,
        student_nis: payload.row.student_nis,
        sekolah_tujuan: payload.row.sekolah_tujuan,
        tanggal_surat_pindah: payload.row.tanggal_surat_pindah,
        tanggal_diterima_tujuan: payload.row.tanggal_diterima_tujuan,
        file_surat: payload.row.file_surat,
        ...payload.patch,
      } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutasi-out"] }); qc.invalidateQueries({ queryKey: ["mutasi-sum"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const sorted = useSortedRows(data as any[], sort, {
    nama: (r) => r.students?.name ?? r.student_name ?? "",
    nis: (r) => r.students?.nis ?? r.student_nis ?? "",
    rombel_asal: (r) => r.rombel?.name ?? "",
    sekolah_tujuan: (r) => r.sekolah_tujuan ?? "",
    tanggal_pindah: (r) => r.tanggal_surat_pindah ?? "",
    dapodik_status: (r) => (r.dapodik_status ?? "belum"),
    dapodik_tanggal: (r) => r.dapodik_tanggal ?? "",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS / sekolah…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortTh label="Nama Murid" field="nama" sort={sort} setSort={setSort} />
              <SortTh label="NIS" field="nis" sort={sort} setSort={setSort} />
              <SortTh label="Rombel Asal" field="rombel_asal" sort={sort} setSort={setSort} />
              <SortTh label="Sekolah Tujuan" field="sekolah_tujuan" sort={sort} setSort={setSort} />
              <SortTh label="Tanggal Pindah" field="tanggal_pindah" sort={sort} setSort={setSort} />
              <SortTh label="Proses Dapodik" field="dapodik_status" sort={sort} setSort={setSort} />
              <SortTh label="Tgl Proses Dapodik" field="dapodik_tanggal" sort={sort} setSort={setSort} />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {sorted.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.students?.name ?? r.student_name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.students?.nis ?? r.student_nis ?? "—"}</TableCell>
                <TableCell><RombelPill name={r.rombel?.name} /></TableCell>
                <TableCell className="max-w-xs truncate">{r.sekolah_tujuan ?? "—"}</TableCell>
                <TableCell className="text-sm">{fmtDateID(r.tanggal_surat_pindah)}</TableCell>
                <TableCell>
                  <DapodikSelect
                    value={r.dapodik_status}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_status: v } })}
                  />
                </TableCell>
                <TableCell>
                  <DapodikDate
                    value={r.dapodik_tanggal}
                    disabled={inlineUpdate.isPending}
                    onChange={(v) => inlineUpdate.mutate({ row: r, patch: { dapodik_tanggal: v } })}
                  />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Eye className="h-4 w-4 text-primary" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {open && <OutDialog open={open} setOpen={setOpen} row={editRow} onSaved={() => { setOpen(false); onChange(); }} />}
    </Card>
  );
}


function OutDialog({ open, setOpen, row, onSaved }: any) {
  const email = useCurrentEmail();
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertTransferOut);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    rombel_id: row?.rombel_id ?? "",
    student_name: row?.student_name ?? row?.students?.name ?? "",
    student_nis: row?.student_nis ?? row?.students?.nis ?? "",
    sekolah_tujuan: row?.sekolah_tujuan ?? "",
    tanggal_surat_pindah: row?.tanggal_surat_pindah ?? new Date().toISOString().slice(0, 10),
    tanggal_diterima_tujuan: row?.tanggal_diterima_tujuan ?? "",
    file_surat: row?.file_surat ?? "",
  });
  const filteredStudents = useMemo(
    () => (f.rombel_id ? students.filter((s: any) => s.rombel_id === f.rombel_id) : []),
    [students, f.rombel_id],
  );
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: row?.id, ...f } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Form Pindah Sekolah</DialogTitle>
          <DialogDescription>Murid yang dipindah akan otomatis dikeluarkan dari rombel</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Rombel <span className="text-destructive">*</span></Label>
            <Select value={f.rombel_id} onValueChange={(v) => setF({ ...f, rombel_id: v, student_id: "", student_name: "", student_nis: "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nama Murid <span className="text-destructive">*</span></Label>
            <Select
              value={f.student_id}
              onValueChange={(v) => {
                const s: any = filteredStudents.find((x: any) => x.id === v);
                setF({ ...f, student_id: v, student_name: s?.name ?? "", student_nis: s?.nis ?? "" });
              }}
              disabled={!f.rombel_id}
            >
              <SelectTrigger><SelectValue placeholder={f.rombel_id ? "Pilih murid" : "Pilih rombel terlebih dahulu"} /></SelectTrigger>
              <SelectContent>{filteredStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>NIS</Label>
            <Input value={f.student_nis} readOnly className="bg-muted" />
          </div>
          <div>
            <Label>Sekolah Tujuan <span className="text-destructive">*</span></Label>
            <Input placeholder="Nama sekolah tujuan" value={f.sekolah_tujuan} onChange={(e) => setF({ ...f, sekolah_tujuan: e.target.value })} />
          </div>
          <div>
            <Label>Tanggal Surat Pindah <span className="text-destructive">*</span></Label>
            <Input type="date" value={f.tanggal_surat_pindah} onChange={(e) => setF({ ...f, tanggal_surat_pindah: e.target.value })} />
          </div>
          <div>
            <Label>Tanggal Diterima</Label>
            <Input type="date" value={f.tanggal_diterima_tujuan} onChange={(e) => setF({ ...f, tanggal_diterima_tujuan: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Upload File Surat</Label>
            <FileUploadField value={f.file_surat} onChange={(v) => setF({ ...f, file_surat: v })} />
          </div>
          <div className="md:col-span-2"><DiinputOleh email={email} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!f.student_id || !f.rombel_id || !f.sekolah_tujuan || !f.tanggal_surat_pindah || save.isPending}
          >
            Simpan Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
