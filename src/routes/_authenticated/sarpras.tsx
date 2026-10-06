import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listJenis, upsertJenis, deleteJenis,
  listRuang, upsertRuang, deleteRuang,
  listPengajuan, createPengajuan, decidePengajuan, deletePengajuan,
  sarprasOptions,
} from "@/lib/sarpras.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Check, X } from "lucide-react";

const jenisQO = queryOptions({ queryKey: ["sarpras-jenis"], queryFn: () => listJenis() });
const ruangQO = queryOptions({ queryKey: ["sarpras-ruang"], queryFn: () => listRuang() });
const optsQO = queryOptions({ queryKey: ["sarpras-opts"], queryFn: () => sarprasOptions() });

export const Route = createFileRoute("/_authenticated/sarpras")({
  head: () => ({ meta: [{ title: "Sarpras — SUPREME XPOES" }] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(jenisQO),
    context.queryClient.ensureQueryData(ruangQO),
    context.queryClient.ensureQueryData(optsQO),
  ]),
  component: SarprasPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

function SarprasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sarana & Prasarana</h1>
        <p className="text-sm text-muted-foreground">Kelola jenis ruang, daftar ruang, dan pengajuan sarpras.</p>
      </div>
      <Tabs defaultValue="ruang">
        <TabsList>
          <TabsTrigger value="ruang">Ruang</TabsTrigger>
          <TabsTrigger value="jenis">Jenis Ruang</TabsTrigger>
          <TabsTrigger value="pengajuan">Pengajuan</TabsTrigger>
        </TabsList>
        <TabsContent value="ruang" className="mt-4"><RuangPane /></TabsContent>
        <TabsContent value="jenis" className="mt-4"><JenisPane /></TabsContent>
        <TabsContent value="pengajuan" className="mt-4"><PengajuanPane /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Jenis =====
function JenisPane() {
  const { data } = useSuspenseQuery(jenisQO);
  const qc = useQueryClient();
  const delFn = useServerFn(deleteJenis);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["sarpras-jenis"] }); qc.invalidateQueries({ queryKey: ["sarpras-opts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Jenis Ruang</CardTitle>
        <JenisDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-32">Ruang Kelas</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nama}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.keterangan ?? "—"}</TableCell>
                <TableCell>{r.is_kelas ? <Badge>Ya</Badge> : <Badge variant="secondary">Tidak</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <JenisDialog row={r} trigger={<Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>} />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Belum ada jenis ruang.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function JenisDialog({ row, trigger }: { row?: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState(row?.nama ?? "");
  const [keterangan, setKeterangan] = useState(row?.keterangan ?? "");
  const [isKelas, setIsKelas] = useState<boolean>(row?.is_kelas ?? false);
  const qc = useQueryClient();
  const upFn = useServerFn(upsertJenis);
  const m = useMutation({
    mutationFn: () => upFn({ data: { id: row?.id, nama, keterangan: keterangan || undefined, isKelas } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["sarpras-jenis"] }); qc.invalidateQueries({ queryKey: ["sarpras-opts"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Jenis Ruang</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nama</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} /></div>
          <div className="space-y-1"><Label>Keterangan</Label><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
          <div className="flex items-center gap-2"><Switch checked={isKelas} onCheckedChange={setIsKelas} /><Label>Termasuk ruang kelas</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !nama}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Ruang =====
function RuangPane() {
  const { data } = useSuspenseQuery(ruangQO);
  const qc = useQueryClient();
  const delFn = useServerFn(deleteRuang);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["sarpras-ruang"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Daftar Ruang</CardTitle>
        <RuangDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead className="w-24">Kapasitas</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.kode_ruang ?? "—"}</TableCell>
                <TableCell className="font-medium">{r.nama}</TableCell>
                <TableCell>{r.jenis_nama}</TableCell>
                <TableCell>{r.rombel_nama}</TableCell>
                <TableCell>{r.kapasitas ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <RuangDialog row={r} trigger={<Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>} />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Belum ada ruang.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RuangDialog({ row, trigger }: { row?: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: opts } = useSuspenseQuery(optsQO);
  const [nama, setNama] = useState(row?.nama ?? "");
  const [kodeRuang, setKodeRuang] = useState(row?.kode_ruang ?? "");
  const [kapasitas, setKapasitas] = useState<string>(row?.kapasitas?.toString() ?? "");
  const [jenisRuangId, setJenisRuangId] = useState<string>(row?.jenis_ruang_id ?? "");
  const [rombelId, setRombelId] = useState<string>(row?.rombel_id ?? "");
  const qc = useQueryClient();
  const upFn = useServerFn(upsertRuang);
  const m = useMutation({
    mutationFn: () => upFn({ data: {
      id: row?.id, nama,
      kodeRuang: kodeRuang || undefined,
      kapasitas: kapasitas ? Number(kapasitas) : undefined,
      jenisRuangId: jenisRuangId || undefined,
      rombelId: rombelId || undefined,
    } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["sarpras-ruang"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Ruang</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Kode Ruang</Label><Input value={kodeRuang} onChange={(e) => setKodeRuang(e.target.value)} /></div>
            <div className="space-y-1"><Label>Kapasitas</Label><Input type="number" value={kapasitas} onChange={(e) => setKapasitas(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Nama Ruang</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Jenis Ruang</Label>
            <Select value={jenisRuangId} onValueChange={setJenisRuangId}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
              <SelectContent>
                {opts.jenis.map((j: any) => <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Rombel (opsional)</Label>
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>
                {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !nama}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Pengajuan =====
function PengajuanPane() {
  const [status, setStatus] = useState<string>("all");
  const fetchFn = useServerFn(listPengajuan);
  const { data } = useSuspenseQuery({
    queryKey: ["sarpras-pengajuan", status],
    queryFn: () => fetchFn({ data: { status } }),
  }) as { data: any[] };
  const qc = useQueryClient();
  const delFn = useServerFn(deletePengajuan);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["sarpras-pengajuan"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const stBadge = (s: string) =>
    s === "disetujui" ? <Badge>Disetujui</Badge>
    : s === "ditolak" ? <Badge variant="destructive">Ditolak</Badge>
    : <Badge variant="secondary">Pending</Badge>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-base">Pengajuan Sarpras</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="disetujui">Disetujui</SelectItem>
              <SelectItem value="ditolak">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          <PengajuanDialog />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead>Keperluan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>{r.jenis}</TableCell>
                <TableCell className="font-medium">{r.nama}</TableCell>
                <TableCell>{r.quantity} {r.satuan ?? ""}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.keperluan}</TableCell>
                <TableCell className="font-mono text-xs">{r.total_harga ? `Rp${r.total_harga.toLocaleString("id-ID")}` : "—"}</TableCell>
                <TableCell>{stBadge(r.status ?? "pending")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status === "pending" && <DecideDialog row={r} />}
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Belum ada pengajuan.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PengajuanDialog() {
  const [open, setOpen] = useState(false);
  const [jenis, setJenis] = useState("Barang");
  const [nama, setNama] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [satuan, setSatuan] = useState("");
  const [perkiraanHarga, setPerkiraanHarga] = useState("");
  const [linkReferensi, setLinkReferensi] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const qc = useQueryClient();
  const upFn = useServerFn(createPengajuan);
  const m = useMutation({
    mutationFn: () => upFn({ data: {
      jenis, nama, quantity: Number(quantity),
      satuan: satuan || undefined,
      perkiraanHarga: perkiraanHarga ? Number(perkiraanHarga) : undefined,
      linkReferensi: linkReferensi || undefined,
      keperluan,
    } }),
    onSuccess: () => { toast.success("Diajukan"); qc.invalidateQueries({ queryKey: ["sarpras-pengajuan"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajukan</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Pengajuan Sarpras</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={setJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Barang">Barang</SelectItem>
                  <SelectItem value="Jasa">Jasa</SelectItem>
                  <SelectItem value="Perbaikan">Perbaikan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Nama Barang/Jasa</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1"><Label>Qty</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <div className="space-y-1"><Label>Satuan</Label><Input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="pcs" /></div>
            <div className="space-y-1"><Label>Harga Satuan</Label><Input type="number" value={perkiraanHarga} onChange={(e) => setPerkiraanHarga(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Link Referensi</Label><Input value={linkReferensi} onChange={(e) => setLinkReferensi(e.target.value)} placeholder="https://..." /></div>
          <div className="space-y-1"><Label>Keperluan</Label><Textarea value={keperluan} onChange={(e) => setKeperluan(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !nama || !keperluan}>{m.isPending ? "Mengirim..." : "Ajukan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"disetujui" | "ditolak">("disetujui");
  const [catatan, setCatatan] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(decidePengajuan);
  const m = useMutation({
    mutationFn: () => fn({ data: { id: row.id, decision, catatan: catatan || undefined } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["sarpras-pengajuan"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Check className="h-3 w-3 mr-1" />Putuskan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Keputusan Pengajuan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm"><b>{row.nama}</b> — {row.quantity} {row.satuan ?? ""}</div>
          <div className="flex gap-2">
            <Button variant={decision === "disetujui" ? "default" : "outline"} onClick={() => setDecision("disetujui")} className="flex-1"><Check className="h-4 w-4 mr-1" />Setujui</Button>
            <Button variant={decision === "ditolak" ? "destructive" : "outline"} onClick={() => setDecision("ditolak")} className="flex-1"><X className="h-4 w-4 mr-1" />Tolak</Button>
          </div>
          {decision === "ditolak" && (
            <div className="space-y-1"><Label>Catatan Penolakan</Label><Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
