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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listRombelTransfers, upsertRombelTransfer, deleteRombelTransfer,
  listResignations, upsertResignation, deleteResignation,
  listTransfersOut, upsertTransferOut, deleteTransferOut,
  listStudentsForMutasi, listRombelForMutasi, mutasiSummary,
} from "@/lib/mutasi.functions";

export const Route = createFileRoute("/_authenticated/mutasi")({
  head: () => ({ meta: [{ title: "Mutasi Siswa — SUPREME XPOES" }] }),
  component: MutasiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

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
          <h1 className="text-2xl font-bold">Mutasi Siswa</h1>
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
  const listFn = useServerFn(listRombelTransfers);
  const delFn = useServerFn(deleteRombelTransfer);
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-rombel", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Asal</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Dapodik</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.tanggal_pindah ?? "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.students?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.students?.nis ?? ""}</div>
                </TableCell>
                <TableCell>{r.asal?.name ?? "—"}</TableCell>
                <TableCell>{r.tujuan?.name ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{r.alasan ?? "—"}</TableCell>
                <TableCell><Badge variant={r.dapodik_status === "sinkron" ? "default" : "secondary"}>{r.dapodik_status ?? "belum"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertRombelTransfer);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    rombel_asal_id: row?.rombel_asal_id ?? "",
    rombel_tujuan_id: row?.rombel_tujuan_id ?? "",
    tanggal_pindah: row?.tanggal_pindah ?? new Date().toISOString().slice(0, 10),
    alasan: row?.alasan ?? "",
    dapodik_status: row?.dapodik_status ?? "belum",
    dapodik_tanggal: row?.dapodik_tanggal ?? "",
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: row?.id, ...f } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Pindah Rombel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Siswa</Label>
            <Select value={f.student_id} onValueChange={(v) => {
              const s: any = students.find((x: any) => x.id === v);
              setF({ ...f, student_id: v, rombel_asal_id: s?.rombel_id ?? "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} {s.nis ? `(${s.nis})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Rombel Asal</Label>
              <Select value={f.rombel_asal_id} onValueChange={(v) => setF({ ...f, rombel_asal_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rombel Tujuan</Label>
              <Select value={f.rombel_tujuan_id} onValueChange={(v) => setF({ ...f, rombel_tujuan_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Tanggal Pindah</Label>
            <Input type="date" value={f.tanggal_pindah} onChange={(e) => setF({ ...f, tanggal_pindah: e.target.value })} />
          </div>
          <div>
            <Label>Alasan</Label>
            <Textarea value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status Dapodik</Label>
              <Select value={f.dapodik_status} onValueChange={(v) => setF({ ...f, dapodik_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="proses">Proses</SelectItem>
                  <SelectItem value="sinkron">Sinkron</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tgl Dapodik</Label>
              <Input type="date" value={f.dapodik_tanggal} onChange={(e) => setF({ ...f, dapodik_tanggal: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={!f.student_id || !f.rombel_tujuan_id || save.isPending}>Simpan</Button>
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
  const listFn = useServerFn(listResignations);
  const delFn = useServerFn(deleteResignation);
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-resign", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS / alasan…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tgl Surat</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Dapodik</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.tanggal_surat ?? "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.students?.name ?? r.student_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.students?.nis ?? r.student_nis ?? ""}</div>
                </TableCell>
                <TableCell>{r.rombel?.name ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{r.alasan ?? "—"}</TableCell>
                <TableCell><Badge variant={r.dapodik_status === "sinkron" ? "default" : "secondary"}>{r.dapodik_status ?? "belum"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertResignation);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    rombel_id: row?.rombel_id ?? "",
    student_name: row?.student_name ?? "",
    student_nis: row?.student_nis ?? "",
    tanggal_surat: row?.tanggal_surat ?? new Date().toISOString().slice(0, 10),
    alasan: row?.alasan ?? "",
    file_surat: row?.file_surat ?? "",
    dapodik_status: row?.dapodik_status ?? "belum",
    dapodik_tanggal: row?.dapodik_tanggal ?? "",
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: row?.id, ...f } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Resign / Keluar</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Siswa</Label>
            <Select value={f.student_id} onValueChange={(v) => {
              const s: any = students.find((x: any) => x.id === v);
              setF({ ...f, student_id: v, rombel_id: s?.rombel_id ?? "", student_name: s?.name ?? "", student_nis: s?.nis ?? "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} {s.nis ? `(${s.nis})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nama</Label><Input value={f.student_name} onChange={(e) => setF({ ...f, student_name: e.target.value })} /></div>
            <div><Label>NIS</Label><Input value={f.student_nis} onChange={(e) => setF({ ...f, student_nis: e.target.value })} /></div>
          </div>
          <div>
            <Label>Rombel</Label>
            <Select value={f.rombel_id} onValueChange={(v) => setF({ ...f, rombel_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Tgl Surat</Label><Input type="date" value={f.tanggal_surat} onChange={(e) => setF({ ...f, tanggal_surat: e.target.value })} /></div>
            <div><Label>File Surat (URL)</Label><Input value={f.file_surat} onChange={(e) => setF({ ...f, file_surat: e.target.value })} /></div>
          </div>
          <div>
            <Label>Alasan</Label>
            <Textarea value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status Dapodik</Label>
              <Select value={f.dapodik_status} onValueChange={(v) => setF({ ...f, dapodik_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="proses">Proses</SelectItem>
                  <SelectItem value="sinkron">Sinkron</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tgl Dapodik</Label><Input type="date" value={f.dapodik_tanggal} onChange={(e) => setF({ ...f, dapodik_tanggal: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Simpan</Button>
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
  const listFn = useServerFn(listTransfersOut);
  const delFn = useServerFn(deleteTransferOut);
  const { data } = useSuspenseQuery({
    queryKey: ["mutasi-out", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
        <Input placeholder="Cari nama / NIS / sekolah…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <div className="ml-auto">
          <Button onClick={() => { setEditRow(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Tambah</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tgl Surat</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead>Sekolah Tujuan</TableHead>
              <TableHead>Diterima</TableHead>
              <TableHead>Dapodik</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
            )}
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{r.tanggal_surat_pindah ?? "—"}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.students?.name ?? r.student_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.students?.nis ?? r.student_nis ?? ""}</div>
                </TableCell>
                <TableCell>{r.rombel?.name ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{r.sekolah_tujuan ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.tanggal_diterima_tujuan ?? "—"}</TableCell>
                <TableCell><Badge variant={r.dapodik_status === "sinkron" ? "default" : "secondary"}>{r.dapodik_status ?? "belum"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
  const studentsFn = useServerFn(listStudentsForMutasi);
  const rombelFn = useServerFn(listRombelForMutasi);
  const saveFn = useServerFn(upsertTransferOut);
  const { data: students = [] } = useQuery({ queryKey: ["mutasi-students"], queryFn: () => studentsFn() });
  const { data: rombels = [] } = useQuery({ queryKey: ["mutasi-rombels"], queryFn: () => rombelFn() });
  const [f, setF] = useState({
    student_id: row?.student_id ?? "",
    rombel_id: row?.rombel_id ?? "",
    student_name: row?.student_name ?? "",
    student_nis: row?.student_nis ?? "",
    sekolah_tujuan: row?.sekolah_tujuan ?? "",
    tanggal_surat_pindah: row?.tanggal_surat_pindah ?? new Date().toISOString().slice(0, 10),
    tanggal_diterima_tujuan: row?.tanggal_diterima_tujuan ?? "",
    file_surat: row?.file_surat ?? "",
    dapodik_status: row?.dapodik_status ?? "belum",
    dapodik_tanggal: row?.dapodik_tanggal ?? "",
  });
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: row?.id, ...f } }),
    onSuccess: () => { toast.success("Disimpan"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Pindah Sekolah</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Siswa</Label>
            <Select value={f.student_id} onValueChange={(v) => {
              const s: any = students.find((x: any) => x.id === v);
              setF({ ...f, student_id: v, rombel_id: s?.rombel_id ?? "", student_name: s?.name ?? "", student_nis: s?.nis ?? "" });
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} {s.nis ? `(${s.nis})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nama</Label><Input value={f.student_name} onChange={(e) => setF({ ...f, student_name: e.target.value })} /></div>
            <div><Label>NIS</Label><Input value={f.student_nis} onChange={(e) => setF({ ...f, student_nis: e.target.value })} /></div>
          </div>
          <div>
            <Label>Rombel</Label>
            <Select value={f.rombel_id} onValueChange={(v) => setF({ ...f, rombel_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sekolah Tujuan</Label>
            <Input value={f.sekolah_tujuan} onChange={(e) => setF({ ...f, sekolah_tujuan: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Tgl Surat Pindah</Label><Input type="date" value={f.tanggal_surat_pindah} onChange={(e) => setF({ ...f, tanggal_surat_pindah: e.target.value })} /></div>
            <div><Label>Tgl Diterima</Label><Input type="date" value={f.tanggal_diterima_tujuan} onChange={(e) => setF({ ...f, tanggal_diterima_tujuan: e.target.value })} /></div>
          </div>
          <div><Label>File Surat (URL)</Label><Input value={f.file_surat} onChange={(e) => setF({ ...f, file_surat: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Status Dapodik</Label>
              <Select value={f.dapodik_status} onValueChange={(v) => setF({ ...f, dapodik_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="belum">Belum</SelectItem>
                  <SelectItem value="proses">Proses</SelectItem>
                  <SelectItem value="sinkron">Sinkron</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tgl Dapodik</Label><Input type="date" value={f.dapodik_tanggal} onChange={(e) => setF({ ...f, dapodik_tanggal: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
