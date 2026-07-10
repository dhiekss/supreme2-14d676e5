import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  listVerval,
  upsertVerval,
  validateVerval,
  deleteVerval,
  summaryVerval,
  listStudentsForVerval,
} from "@/lib/verval.functions";

export const Route = createFileRoute("/_authenticated/verval")({
  head: () => ({ meta: [{ title: "Verval Siswa — SUPREME XPOES" }] }),
  component: VervalPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const STATUS_OPTS = [
  { value: "all", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "valid", label: "Valid" },
  { value: "tolak", label: "Ditolak" },
];

function VervalPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const fetchList = useServerFn(listVerval);
  const fetchSum = useServerFn(summaryVerval);
  const fetchStudents = useServerFn(listStudentsForVerval);
  const upFn = useServerFn(upsertVerval);
  const valFn = useServerFn(validateVerval);
  const delFn = useServerFn(deleteVerval);

  const { data } = useSuspenseQuery({
    queryKey: ["verval", status, search],
    queryFn: () => fetchList({ data: { status: status === "all" ? undefined : status, search: search || undefined } }),
  });
  const { data: sum } = useQuery({ queryKey: ["verval-sum"], queryFn: () => fetchSum() });
  const { data: students } = useQuery({ queryKey: ["verval-students"], queryFn: () => fetchStudents() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["verval"] });
    qc.invalidateQueries({ queryKey: ["verval-sum"] });
  };

  const upsert = useMutation({
    mutationFn: (v: any) => upFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); setOpen(false); setEdit(null); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const validate = useMutation({
    mutationFn: (v: { id: string; status: "valid" | "tolak" | "pending" }) => valFn({ data: v }),
    onSuccess: () => { toast.success("Status diperbarui"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Terhapus"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verval Siswa</h1>
          <p className="text-sm text-muted-foreground">Verifikasi & validasi data peserta didik</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Tambah Verval</Button>
          </DialogTrigger>
          <FormDialog
            edit={edit}
            students={students ?? []}
            onSubmit={(v) => upsert.mutate(v)}
            loading={upsert.isPending}
          />
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SumCard title="Menunggu" value={sum?.pending ?? 0} tone="bg-yellow-500/10 text-yellow-700" />
        <SumCard title="Valid" value={sum?.valid ?? 0} tone="bg-green-500/10 text-green-700" />
        <SumCard title="Ditolak" value={sum?.tolak ?? 0} tone="bg-red-500/10 text-red-700" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Input placeholder="Cari nama / NIS / NISN…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>NISN</TableHead>
                <TableHead>TTL</TableHead>
                <TableHead>Orang Tua</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
              )}
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.students?.name ?? r.nama_perbaikan ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">NIS: {r.students?.nis ?? "—"}</div>
                  </TableCell>
                  <TableCell>{r.nisn ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {r.tempat_lahir ?? "—"}{r.tanggal_lahir ? `, ${r.tanggal_lahir}` : ""}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>Ayah: {r.nama_ayah ?? "—"}</div>
                    <div>Ibu: {r.nama_ibu ?? "—"}</div>
                  </TableCell>
                  <TableCell><StatusBadge s={r.status} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status !== "valid" && (
                      <Button size="sm" variant="ghost" onClick={() => validate.mutate({ id: r.id, status: "valid" })}><Check className="h-4 w-4 text-green-600" /></Button>
                    )}
                    {r.status !== "tolak" && (
                      <Button size="sm" variant="ghost" onClick={() => validate.mutate({ id: r.id, status: "tolak" })}><X className="h-4 w-4 text-red-600" /></Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SumCard({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className={`inline-flex px-3 py-1 rounded-md text-2xl font-bold ${tone}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ s }: { s: string }) {
  if (s === "valid") return <Badge className="bg-green-500/10 text-green-700">Valid</Badge>;
  if (s === "tolak") return <Badge className="bg-red-500/10 text-red-700">Ditolak</Badge>;
  return <Badge className="bg-yellow-500/10 text-yellow-700">Menunggu</Badge>;
}

function FormDialog({ edit, students, onSubmit, loading }: { edit: any; students: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState<any>(() => ({
    id: edit?.id,
    student_id: edit?.student_id ?? "",
    nisn: edit?.nisn ?? "",
    nama_perbaikan: edit?.nama_perbaikan ?? "",
    tempat_lahir: edit?.tempat_lahir ?? "",
    tanggal_lahir: edit?.tanggal_lahir ?? "",
    agama: edit?.agama ?? "",
    nama_ayah: edit?.nama_ayah ?? "",
    nama_ibu: edit?.nama_ibu ?? "",
    status: edit?.status ?? "pending",
    catatan_perbaikan: edit?.catatan_perbaikan ?? "",
  }));

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{edit ? "Edit" : "Tambah"} Verval Siswa</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Siswa</Label>
          <Select value={form.student_id} onValueChange={(v) => set("student_id", v)}>
            <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.nis ?? "-"})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>NISN</Label><Input value={form.nisn} onChange={(e) => set("nisn", e.target.value)} /></div>
        <div><Label>Nama (perbaikan)</Label><Input value={form.nama_perbaikan} onChange={(e) => set("nama_perbaikan", e.target.value)} /></div>
        <div><Label>Tempat Lahir</Label><Input value={form.tempat_lahir} onChange={(e) => set("tempat_lahir", e.target.value)} /></div>
        <div><Label>Tanggal Lahir</Label><Input type="date" value={form.tanggal_lahir ?? ""} onChange={(e) => set("tanggal_lahir", e.target.value)} /></div>
        <div><Label>Agama</Label><Input value={form.agama} onChange={(e) => set("agama", e.target.value)} /></div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="tolak">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Nama Ayah</Label><Input value={form.nama_ayah} onChange={(e) => set("nama_ayah", e.target.value)} /></div>
        <div><Label>Nama Ibu</Label><Input value={form.nama_ibu} onChange={(e) => set("nama_ibu", e.target.value)} /></div>
        <div className="col-span-2"><Label>Catatan Perbaikan</Label><Textarea value={form.catatan_perbaikan ?? ""} onChange={(e) => set("catatan_perbaikan", e.target.value)} /></div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.student_id}>Simpan</Button>
      </DialogFooter>
    </DialogContent>
  );
}
