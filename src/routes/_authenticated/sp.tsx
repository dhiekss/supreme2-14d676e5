import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { listSp, createSp, deleteSp, listAllStudents } from "@/lib/sp.functions";
import { Trash2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sp")({
  head: () => ({ meta: [{ title: "Surat Peringatan — SUPREME XPOES" }] }),
  loader: async () => ({ students: await listAllStudents() }),
  component: SpPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const levelColor: Record<number, string> = {
  1: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  2: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  3: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

function SpPage() {
  const { students } = Route.useLoaderData();
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listSp);
  const removeFn = useServerFn(deleteSp);

  const { data } = useSuspenseQuery({
    queryKey: ["sp", filterLevel],
    queryFn: () => fetchList({ data: { level: filterLevel === "all" ? undefined : Number(filterLevel) } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { toast.success("SP dihapus"); qc.invalidateQueries({ queryKey: ["sp"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surat Peringatan</h1>
          <p className="text-sm text-muted-foreground">Catat & pantau SP siswa berdasarkan pelanggaran.</p>
        </div>
        <SpFormDialog students={students} onCreated={() => qc.invalidateQueries({ queryKey: ["sp"] })} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">Daftar SP — {data.length}</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Tingkat:</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="1">SP 1</SelectItem>
                  <SelectItem value="2">SP 2</SelectItem>
                  <SelectItem value="3">SP 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead className="text-center">Alfa</TableHead>
                <TableHead className="text-center">Terlambat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Belum ada catatan SP</TableCell></TableRow>
              ) : (
                data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.tanggal_rekaman}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={levelColor[Number(r.sp_level)] ?? ""}>SP {r.sp_level}</Badge>
                    </TableCell>
                    <TableCell>{r.student_nis}</TableCell>
                    <TableCell>{r.student_name}</TableCell>
                    <TableCell>{r.rombel_name}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={r.alasan ?? ""}>{r.alasan}</TableCell>
                    <TableCell className="text-center">{r.jumlah_alfa ?? 0}</TableCell>
                    <TableCell className="text-center">{r.jumlah_terlambat ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.dokumen_pendukung && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={r.dokumen_pendukung} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus SP ini?")) del.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SpFormDialog({ students, onCreated }: { students: any[]; onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    studentId: "",
    spLevel: 1,
    tanggalRekaman: today,
    alasan: "",
    jumlahAlfa: 0,
    jumlahTerlambat: 0,
    dokumenPendukung: "",
  });
  const createFn = useServerFn(createSp);

  const filtered = useMemo(() => {
    if (!search) return students.slice(0, 50);
    const q = search.toLowerCase();
    return students.filter((s: any) =>
      (s.name ?? "").toLowerCase().includes(q) || (s.nis ?? "").toLowerCase().includes(q)
    ).slice(0, 50);
  }, [students, search]);

  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("SP dicatat");
      setOpen(false);
      setForm({ studentId: "", spLevel: 1, tanggalRekaman: today, alasan: "", jumlahAlfa: 0, jumlahTerlambat: 0, dokumenPendukung: "" });
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.studentId) return toast.error("Pilih siswa");
    if (!form.alasan || form.alasan.length < 3) return toast.error("Alasan minimal 3 karakter");
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Catat SP Baru</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Catat Surat Peringatan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Cari siswa</Label>
            <Input placeholder="Nama atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>
                {filtered.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} {s.nis ? `(${s.nis})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tingkat SP</Label>
              <Select value={String(form.spLevel)} onValueChange={(v) => setForm({ ...form, spLevel: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">SP 1</SelectItem>
                  <SelectItem value="2">SP 2</SelectItem>
                  <SelectItem value="3">SP 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggalRekaman} onChange={(e) => setForm({ ...form, tanggalRekaman: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jumlah Alfa</Label>
              <Input type="number" min={0} value={form.jumlahAlfa} onChange={(e) => setForm({ ...form, jumlahAlfa: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <Label>Jumlah Terlambat</Label>
              <Input type="number" min={0} value={form.jumlahTerlambat} onChange={(e) => setForm({ ...form, jumlahTerlambat: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Alasan / Pelanggaran</Label>
            <Textarea rows={3} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} placeholder="Deskripsikan pelanggaran..." />
          </div>
          <div className="space-y-1">
            <Label>Link Dokumen Pendukung (opsional)</Label>
            <Input type="url" value={form.dokumenPendukung} onChange={(e) => setForm({ ...form, dokumenPendukung: e.target.value })} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={create.isPending}>{create.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
