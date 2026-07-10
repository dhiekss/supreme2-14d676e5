import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listKode, upsertKode, deleteKode,
  listNomor, upsertNomor, incrementNomor, deleteNomor,
  listKop, upsertKop, deleteKop,
} from "@/lib/persuratan.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit, RefreshCw } from "lucide-react";

const kodeQO = queryOptions({ queryKey: ["persuratan-kode"], queryFn: () => listKode() });
const nomorQO = queryOptions({ queryKey: ["persuratan-nomor"], queryFn: () => listNomor() });
const kopQO = queryOptions({ queryKey: ["persuratan-kop"], queryFn: () => listKop() });

export const Route = createFileRoute("/_authenticated/persuratan")({
  head: () => ({ meta: [{ title: "Persuratan — SUPREME XPOES" }] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(kodeQO),
    context.queryClient.ensureQueryData(nomorQO),
    context.queryClient.ensureQueryData(kopQO),
  ]),
  component: PersuratanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function PersuratanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Persuratan</h1>
        <p className="text-sm text-muted-foreground">Kelola kode surat, nomor surat, dan kop surat sekolah.</p>
      </div>
      <Tabs defaultValue="kode">
        <TabsList>
          <TabsTrigger value="kode">Kode Surat</TabsTrigger>
          <TabsTrigger value="nomor">Nomor Surat</TabsTrigger>
          <TabsTrigger value="kop">Kop Surat</TabsTrigger>
        </TabsList>
        <TabsContent value="kode" className="mt-4"><KodePane /></TabsContent>
        <TabsContent value="nomor" className="mt-4"><NomorPane /></TabsContent>
        <TabsContent value="kop" className="mt-4"><KopPane /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Kode Surat =====
function KodePane() {
  const { data } = useSuspenseQuery(kodeQO);
  const qc = useQueryClient();
  const delFn = useServerFn(deleteKode);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["persuratan-kode"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Daftar Kode Surat</CardTitle>
        <KodeDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-24">Urutan</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-mono font-medium">{r.kode}</TableCell>
                <TableCell>{r.nama}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.keterangan ?? "—"}</TableCell>
                <TableCell>{r.urutan ?? "—"}</TableCell>
                <TableCell>{r.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <KodeDialog row={r} trigger={<Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>} />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus kode ini?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada kode surat.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function KodeDialog({ row, trigger }: { row?: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [kode, setKode] = useState(row?.kode ?? "");
  const [nama, setNama] = useState(row?.nama ?? "");
  const [keterangan, setKeterangan] = useState(row?.keterangan ?? "");
  const [urutan, setUrutan] = useState<string>(row?.urutan?.toString() ?? "");
  const [isActive, setIsActive] = useState<boolean>(row?.is_active ?? true);
  const qc = useQueryClient();
  const upFn = useServerFn(upsertKode);
  const m = useMutation({
    mutationFn: () => upFn({ data: {
      id: row?.id, kode, nama,
      keterangan: keterangan || undefined,
      urutan: urutan ? Number(urutan) : undefined,
      isActive,
    } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["persuratan-kode"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Kode Surat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Kode</Label><Input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="800" /></div>
          <div className="space-y-1"><Label>Nama</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Kepegawaian" /></div>
          <div className="space-y-1"><Label>Keterangan</Label><Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} /></div>
          <div className="space-y-1"><Label>Urutan</Label><Input type="number" value={urutan} onChange={(e) => setUrutan(e.target.value)} /></div>
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Aktif</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !kode || !nama}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Nomor Surat =====
function NomorPane() {
  const { data } = useSuspenseQuery(nomorQO);
  const qc = useQueryClient();
  const delFn = useServerFn(deleteNomor);
  const incFn = useServerFn(incrementNomor);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["persuratan-nomor"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const inc = useMutation({
    mutationFn: (id: string) => incFn({ data: { id } }),
    onSuccess: (r: any) => { toast.success(`Nomor: ${r.nomor}`); qc.invalidateQueries({ queryKey: ["persuratan-nomor"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Format Nomor Surat</CardTitle>
        <NomorDialog />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-2">
          Gunakan placeholder: <code>{"{counter}"}</code>, <code>{"{prefix}"}</code>, <code>{"{tahun}"}</code> di format.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jenis</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="w-20">Counter</TableHead>
              <TableHead className="w-20">Tahun</TableHead>
              <TableHead>Contoh</TableHead>
              <TableHead className="w-40">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.jenis_surat}</TableCell>
                <TableCell className="font-mono text-xs">{r.prefix ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.format_nomor}</TableCell>
                <TableCell>{r.counter ?? 0}</TableCell>
                <TableCell>{r.tahun}</TableCell>
                <TableCell className="font-mono text-xs">{r.contoh_hasil ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => inc.mutate(r.id)} title="Generate berikutnya">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <NomorDialog row={r} trigger={<Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>} />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada format.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NomorDialog({ row, trigger }: { row?: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [jenisSurat, setJenisSurat] = useState(row?.jenis_surat ?? "");
  const [prefix, setPrefix] = useState(row?.prefix ?? "");
  const [formatNomor, setFormatNomor] = useState(row?.format_nomor ?? "{counter}/{prefix}/SMK/{tahun}");
  const [counter, setCounter] = useState<string>(row?.counter?.toString() ?? "0");
  const [tahun, setTahun] = useState<string>(row?.tahun?.toString() ?? new Date().getFullYear().toString());
  const [isActive, setIsActive] = useState<boolean>(row?.is_active ?? true);
  const qc = useQueryClient();
  const upFn = useServerFn(upsertNomor);
  const m = useMutation({
    mutationFn: () => upFn({ data: {
      id: row?.id, jenisSurat, prefix: prefix || undefined, formatNomor,
      counter: Number(counter), tahun: Number(tahun), isActive,
    } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["persuratan-nomor"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Format Nomor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Jenis Surat</Label><Input value={jenisSurat} onChange={(e) => setJenisSurat(e.target.value)} placeholder="Surat Tugas" /></div>
          <div className="space-y-1"><Label>Prefix</Label><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="ST" /></div>
          <div className="space-y-1"><Label>Format</Label><Input value={formatNomor} onChange={(e) => setFormatNomor(e.target.value)} className="font-mono" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Counter</Label><Input type="number" value={counter} onChange={(e) => setCounter(e.target.value)} /></div>
            <div className="space-y-1"><Label>Tahun</Label><Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Aktif</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !jenisSurat || !formatNomor}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Kop Surat =====
function KopPane() {
  const { data } = useSuspenseQuery(kopQO);
  const qc = useQueryClient();
  const delFn = useServerFn(deleteKop);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["persuratan-kop"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Kop Surat</CardTitle>
        <KopDialog />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nama}</TableCell>
                <TableCell>
                  {r.file_url
                    ? <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">Lihat</a>
                    : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell>{r.is_active ? <Badge>Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <KopDialog row={r} trigger={<Button size="icon" variant="ghost"><Edit className="h-4 w-4" /></Button>} />
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Belum ada kop surat.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function KopDialog({ row, trigger }: { row?: any; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState(row?.nama ?? "");
  const [fileUrl, setFileUrl] = useState(row?.file_url ?? "");
  const [isActive, setIsActive] = useState<boolean>(row?.is_active ?? true);
  const qc = useQueryClient();
  const upFn = useServerFn(upsertKop);
  const m = useMutation({
    mutationFn: () => upFn({ data: { id: row?.id, nama, fileUrl: fileUrl || undefined, isActive } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["persuratan-kop"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{row ? "Edit" : "Tambah"} Kop Surat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nama</Label><Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Kop Resmi SMK" /></div>
          <div className="space-y-1"><Label>URL File</Label><Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Aktif</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !nama}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
