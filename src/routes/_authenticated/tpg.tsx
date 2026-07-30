import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listGuru, listReferensi, upsertReferensi, deleteReferensi,
  listLaporan, upsertLaporan, deleteLaporan,
  listAdministrasi, listPenyerahanIuran, listPeriodeAktif,
} from "@/lib/tpg.functions";
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tpg")({
  ssr: false,
  head: () => ({ meta: [{ title: "TPG — SUPREME XPOES" }] }),
  loader: async () => ({
    guru: await listGuru(),
    referensi: await listReferensi(),
    laporan: await listLaporan({ data: {} }),
  }),
  component: TpgPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const fmtRp = (n: number | null | undefined) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(Number(n ?? 0));

function TpgPage() {
  const { guru } = Route.useLoaderData();
  const qc = useQueryClient();
  const fetchRef = useServerFn(listReferensi);
  const fetchLap = useServerFn(listLaporan);
  const delRefFn = useServerFn(deleteReferensi);
  const delLapFn = useServerFn(deleteLaporan);

  const { data: referensi } = useSuspenseQuery({
    queryKey: ["tpg-ref"], queryFn: () => fetchRef(),
  });

  const today = new Date();
  const [bulan, setBulan] = useState<string>(String(today.getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));

  const { data: laporan } = useSuspenseQuery({
    queryKey: ["tpg-lap", bulan, tahun],
    queryFn: () => fetchLap({ data: { bulan: Number(bulan), tahun: Number(tahun) } }),
  });

  const delRef = useMutation({
    mutationFn: (id: string) => delRefFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpg-ref"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delLap = useMutation({
    mutationFn: (id: string) => delLapFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpg-lap"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalLap = laporan.reduce((s: number, r: any) => s + Number(r.nominal_diterima ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">TPG</h1>
        <p className="text-sm text-muted-foreground">Tunjangan Profesi Guru — referensi & laporan bulanan.</p>
      </div>

      <Tabs defaultValue="laporan">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="laporan">Laporan TPG</TabsTrigger>
          <TabsTrigger value="administrasi">Administrasi</TabsTrigger>
          <TabsTrigger value="iuran">Penyerahan Iuran</TabsTrigger>
          <TabsTrigger value="periode">Periode Aktif</TabsTrigger>
          <TabsTrigger value="referensi">Referensi</TabsTrigger>
        </TabsList>

        <TabsContent value="administrasi" className="space-y-4">
          <AdministrasiPanel />
        </TabsContent>
        <TabsContent value="iuran" className="space-y-4">
          <IuranPanel />
        </TabsContent>
        <TabsContent value="periode" className="space-y-4">
          <PeriodePanel />
        </TabsContent>


        <TabsContent value="laporan" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Bulan</Label>
                  <Select value={bulan} onValueChange={setBulan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BULAN.map((b, i) => <SelectItem key={i} value={String(i+1)}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <LaporanFormDialog guru={guru} referensi={referensi} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-lap"] })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Laporan — {laporan.length} entri</CardTitle>
              <div className="text-sm font-semibold">Total: {fmtRp(totalLap)}</div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laporan.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada laporan</TableCell></TableRow>
                  ) : laporan.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.guru_nip}</TableCell>
                      <TableCell>{r.guru_nama}</TableCell>
                      <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                      <TableCell>{fmtRp(r.nominal_diterima)}</TableCell>
                      <TableCell>
                        {r.bukti_transfer_url ? (
                          <a href={r.bukti_transfer_url} target="_blank" rel="noreferrer" className="text-primary underline">Lihat</a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <LaporanFormDialog guru={guru} referensi={referensi} item={r} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-lap"] })} />
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) delLap.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referensi" className="space-y-4">
          <div className="flex justify-end">
            <ReferensiFormDialog guru={guru} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-ref"] })} />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Referensi — {referensi.length}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIP</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead>Pangkat/Gol</TableHead>
                    <TableHead>Gaji Pokok</TableHead>
                    <TableHead>Pajak</TableHead>
                    <TableHead>BPJS</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referensi.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada referensi</TableCell></TableRow>
                  ) : referensi.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.guru_nip}</TableCell>
                      <TableCell>{r.guru_nama}</TableCell>
                      <TableCell>{r.pangkat_golongan ?? "—"}</TableCell>
                      <TableCell>{fmtRp(r.gaji_pokok)}</TableCell>
                      <TableCell>{fmtRp(r.besaran_pajak)}</TableCell>
                      <TableCell>{fmtRp(r.besaran_bpjs)}</TableCell>
                      <TableCell className="text-right">
                        <ReferensiFormDialog guru={guru} item={r} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-ref"] })} />
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) delRef.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReferensiFormDialog({ guru, item, onSaved }: { guru: any[]; item?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [guruId, setGuruId] = useState(item?.guru_id ?? "");
  const [pg, setPg] = useState(item?.pangkat_golongan ?? "");
  const [gp, setGp] = useState(String(item?.gaji_pokok ?? 0));
  const [pj, setPj] = useState(String(item?.besaran_pajak ?? 0));
  const [bp, setBp] = useState(String(item?.besaran_bpjs ?? 0));

  const saveFn = useServerFn(upsertReferensi);
  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      id: item?.id, guru_id: guruId, pangkat_golongan: pg,
      gaji_pokok: Number(gp), besaran_pajak: Number(pj), besaran_bpjs: Number(bp),
    }}),
    onSuccess: () => { toast.success("Tersimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              : <Button><Plus className="h-4 w-4 mr-1" /> Tambah Referensi</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit" : "Tambah"} Referensi TPG</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Guru</Label>
            <Select value={guruId} onValueChange={setGuruId}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>
                {guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama} {g.nip ? `(${g.nip})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Pangkat / Golongan</Label>
            <Input value={pg} onChange={(e) => setPg(e.target.value)} placeholder="contoh: III/c" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label>Gaji Pokok</Label>
              <Input type="number" value={gp} onChange={(e) => setGp(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Pajak</Label>
              <Input type="number" value={pj} onChange={(e) => setPj(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>BPJS</Label>
              <Input type="number" value={bp} onChange={(e) => setBp(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={!guruId || save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LaporanFormDialog({ guru, referensi, item, onSaved }: { guru: any[]; referensi: any[]; item?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [guruId, setGuruId] = useState(item?.guru_id ?? "");
  const [refId, setRefId] = useState(item?.referensi_tpg_id ?? "");
  const [bulan, setBulan] = useState(String(item?.bulan ?? today.getMonth() + 1));
  const [tahun, setTahun] = useState(String(item?.tahun ?? today.getFullYear()));
  const [nominal, setNominal] = useState(String(item?.nominal_diterima ?? 0));
  const [bukti, setBukti] = useState(item?.bukti_transfer_url ?? "");

  const guruRefs = referensi.filter((r: any) => r.guru_id === guruId);

  const saveFn = useServerFn(upsertLaporan);
  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      id: item?.id, guru_id: guruId, referensi_tpg_id: refId || null,
      bulan: Number(bulan), tahun: Number(tahun),
      nominal_diterima: Number(nominal), bukti_transfer_url: bukti || null,
    }}),
    onSuccess: () => { toast.success("Tersimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
              : <Button><Plus className="h-4 w-4 mr-1" /> Tambah Laporan</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit" : "Tambah"} Laporan TPG</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Guru</Label>
            <Select value={guruId} onValueChange={(v) => { setGuruId(v); setRefId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>
                {guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama} {g.nip ? `(${g.nip})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {guruRefs.length > 0 && (
            <div className="space-y-1">
              <Label>Referensi (opsional)</Label>
              <Select value={refId} onValueChange={setRefId}>
                <SelectTrigger><SelectValue placeholder="Pilih referensi" /></SelectTrigger>
                <SelectContent>
                  {guruRefs.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.pangkat_golongan ?? "—"} • {fmtRp(r.gaji_pokok)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Bulan</Label>
              <Select value={bulan} onValueChange={setBulan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BULAN.map((b, i) => <SelectItem key={i} value={String(i+1)}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tahun</Label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Nominal Diterima</Label>
            <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>URL Bukti Transfer</Label>
            <Input value={bukti} onChange={(e) => setBukti(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={!guruId || save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PeriodeFilter({ bulan, setBulan, tahun, setTahun }: any) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Bulan</Label>
        <Select value={bulan} onValueChange={setBulan}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {BULAN.map((b, i) => <SelectItem key={i} value={String(i+1)}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Tahun</Label>
        <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
      </div>
    </div>
  );
}

function AdministrasiPanel() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>(String(today.getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const fetchFn = useServerFn(listAdministrasi);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-adm", bulan, tahun],
    queryFn: () => fetchFn({ data: {
      bulan: bulan === "all" ? undefined : Number(bulan),
      tahun: Number(tahun),
    } }),
  });
  const total = rows.reduce((s: number, r: any) => s + Number(r.nominal_iuran ?? 0), 0);
  const sudah = rows.filter((r: any) => r.sudah_administrasi).length;
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent><PeriodeFilter bulan={bulan} setBulan={setBulan} tahun={tahun} setTahun={setTahun} /></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Administrasi — {rows.length} entri ({sudah} sudah)</CardTitle>
          <div className="text-sm font-semibold">Total Iuran: {fmtRp(total)}</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama Guru</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nominal Iuran</TableHead>
                <TableHead>Tgl Administrasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guru_nip}</TableCell>
                  <TableCell>{r.guru_nama}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell>
                    {r.sudah_administrasi ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sudah</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell>{fmtRp(r.nominal_iuran)}</TableCell>
                  <TableCell>{r.tanggal_administrasi ? new Date(r.tanggal_administrasi).toLocaleDateString("id-ID") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function IuranPanel() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>("all");
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const fetchFn = useServerFn(listPenyerahanIuran);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-iur", bulan, tahun],
    queryFn: () => fetchFn({ data: {
      bulan: bulan === "all" ? undefined : Number(bulan),
      tahun: Number(tahun),
    } }),
  });
  const total = rows.reduce((s: number, r: any) => s + Number(r.nominal ?? 0), 0);
  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent><PeriodeFilter bulan={bulan} setBulan={setBulan} tahun={tahun} setTahun={setTahun} /></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Penyerahan Iuran — {rows.length} entri</CardTitle>
          <div className="text-sm font-semibold">Total: {fmtRp(total)}</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Keperluan</TableHead>
                <TableHead>Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tanggal_penyerahan ? new Date(r.tanggal_penyerahan).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell className="capitalize">{(r.keperluan ?? "—").replace(/_/g, " ")}</TableCell>
                  <TableCell>{fmtRp(r.nominal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function PeriodePanel() {
  const fetchFn = useServerFn(listPeriodeAktif);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-periode"], queryFn: () => fetchFn(),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Periode Aktif — {rows.length}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                <TableCell>
                  {r.is_active ? (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>
                  ) : (
                    <Badge variant="secondary">Nonaktif</Badge>
                  )}
                </TableCell>
                <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

