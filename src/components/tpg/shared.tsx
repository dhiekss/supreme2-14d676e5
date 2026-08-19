import { useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Image as ImageIcon, Plus, Pencil, TrendingUp, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { upsertReferensi, upsertLaporan, addKenaikan, deleteKenaikan, signTpgBukti } from "@/lib/tpg.functions";
import { resolveGajiEfektif, gajiEfektifHariIni, hitungPerkiraanTpg, statusKenaikan, sortKenaikan, fmtTanggal } from "@/lib/tpg-gaji";
import { supabase } from "@/integrations/supabase/client";
import { todayWIB } from "@/lib/wib";

export const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
export const BULAN_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export const fmtRp = (n: number | null | undefined) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(Number(n ?? 0));

export function TpgHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export function PeriodeFilter({ bulan, setBulan, tahun, setTahun }: any) {
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

export function ReferensiFormDialog({ guru, item, onSaved }: { guru: any[]; item?: any; onSaved: () => void }) {
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

// Opsi periode pencairan: 1 bulan ke depan s.d. 24 bulan ke belakang.
function periodeOptions(): { value: string; label: string; bulan: number; tahun: number }[] {
  const opts: { value: string; label: string; bulan: number; tahun: number }[] = [];
  const now = new Date();
  for (let i = 1; i >= -24; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const bulan = d.getMonth() + 1;
    const tahun = d.getFullYear();
    opts.push({ value: `${tahun}-${bulan}`, label: `${BULAN_FULL[bulan - 1]} ${tahun}`, bulan, tahun });
  }
  return opts;
}

export function LaporanFormDialog({
  guruId,
  referensi,
  item,
  onSaved,
  trigger,
}: {
  guruId: string;
  referensi: any;
  item?: any;
  onSaved: () => void;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const opts = useMemo(periodeOptions, []);
  const [periode, setPeriode] = useState("");
  const [nominal, setNominal] = useState("");
  const [buktiPath, setBuktiPath] = useState<string | null>(null);
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const saveFn = useServerFn(upsertLaporan);
  const signFn = useServerFn(signTpgBukti);

  // Perkiraan nominal pada periode terpilih (gaji efektif periode tsb - pajak - BPJS).
  const perkiraanFor = (value: string): number | null => {
    if (!referensi) return null;
    const [t, b] = value.split("-").map(Number);
    if (!t || !b) return null;
    const per = `${t}-${String(b).padStart(2, "0")}-01`;
    const gaji = resolveGajiEfektif(referensi.gaji_pokok, referensi.kenaikan, per);
    return hitungPerkiraanTpg(gaji, referensi.besaran_pajak, referensi.besaran_bpjs);
  };

  async function openChange(o: boolean) {
    setOpen(o);
    if (!o) return;
    const now = new Date();
    const def = item ? `${item.tahun}-${item.bulan}` : `${now.getFullYear()}-${now.getMonth() + 1}`;
    setPeriode(def);
    const p = perkiraanFor(def);
    setNominal(item ? String(item.nominal_diterima ?? "") : p != null ? String(p) : "");
    setBuktiPath(item?.bukti_transfer_url ?? null);
    setBuktiPreview(null);
    const existing = item?.bukti_transfer_url;
    if (existing) {
      if (/^https?:\/\//.test(existing)) {
        setBuktiPreview(existing);
      } else {
        try {
          const res = await signFn({ data: { path: existing } });
          setBuktiPreview(res.url);
        } catch { /* abaikan */ }
      }
    }
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const key = `bukti/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("tpg-bukti").upload(key, file, { upsert: false });
      if (error) throw new Error(error.message);
      setBuktiPath(key);
      setBuktiPreview(URL.createObjectURL(file));
      toast.success("Bukti terunggah");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengunggah bukti");
    } finally {
      setUploading(false);
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const [t, b] = periode.split("-").map(Number);
      return saveFn({ data: {
        id: item?.id,
        guru_id: guruId,
        referensi_tpg_id: referensi?.id ?? null,
        bulan: b,
        tahun: t,
        nominal_diterima: Number(nominal) || 0,
        bukti_transfer_url: buktiPath ?? null,
      }});
    },
    onSuccess: () => { toast.success("Laporan tersimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const perkiraan = periode ? perkiraanFor(periode) : null;

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        {trigger ?? (item
          ? <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-1" /> Tambah Laporan</Button>)}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Laporan TPG" : "Tambah Laporan TPG"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Periode Pencairan</Label>
            <Select
              value={periode}
              onValueChange={(v) => {
                setPeriode(v);
                if (!item) {
                  const p = perkiraanFor(v);
                  if (p != null) setNominal(String(p));
                }
              }}
            >
              <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
              <SelectContent>
                {opts.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nominal yang Diterima (Rp)</Label>
            <Input
              inputMode="numeric"
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="Masukkan nominal"
            />
            {perkiraan != null && (
              <p className="text-xs text-muted-foreground">
                Perkiraan periode ini: {fmtRp(perkiraan)} — otomatis terisi, dapat diubah manual.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Bukti Transfer</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-1.5 h-4 w-4" /> Ambil Foto
              </Button>
              <Button type="button" variant="outline" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                <ImageIcon className="mr-1.5 h-4 w-4" /> Galeri
              </Button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            {uploading && <p className="text-xs text-muted-foreground">Mengunggah…</p>}
            {buktiPreview && (
              <img src={buktiPreview} alt="Bukti transfer" className="max-h-40 rounded-md border object-contain" />
            )}
          </div>
          <Button
            className="w-full"
            onClick={() => save.mutate()}
            disabled={!periode || !nominal || save.isPending || uploading}
          >
            <Upload className="mr-1.5 h-4 w-4" /> {save.isPending ? "Menyimpan…" : "Simpan Laporan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function KenaikanGajiDialog({ item, onSaved }: { item: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [nominal, setNominal] = useState("");
  const [tmt, setTmt] = useState(todayWIB());
  const [catatan, setCatatan] = useState("");

  const kenaikan = sortKenaikan(item.kenaikan);
  const gajiEfektif = gajiEfektifHariIni(item.gaji_pokok, kenaikan);

  const addFn = useServerFn(addKenaikan);
  const delFn = useServerFn(deleteKenaikan);

  const add = useMutation({
    mutationFn: () => addFn({ data: {
      referensi_tpg_id: item.id,
      gaji_pokok: Number(nominal),
      tanggal_berlaku: tmt,
      catatan: catatan || null,
    }}),
    onSuccess: () => { toast.success("Kenaikan gaji ditambahkan"); setNominal(""); setCatatan(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Riwayat dihapus"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Kenaikan Gaji Berkala"><TrendingUp className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kenaikan Gaji Berkala — {item.guru_nama}</DialogTitle>
          <DialogDescription>
            Kelola riwayat kenaikan gaji pokok. Gaji efektif dihitung otomatis berdasarkan tanggal mulai berlaku (TMT).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Gaji Pokok Awal</p>
            <p className="text-lg font-semibold">{fmtRp(item.gaji_pokok)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Gaji Efektif Hari Ini</p>
            <p className="text-lg font-semibold text-primary">{fmtRp(gajiEfektif)}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Tambah Kenaikan Gaji</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nominal Gaji Baru</Label>
              <Input type="number" value={nominal} onChange={(e) => setNominal(e.target.value)} placeholder="contoh: 5000000" />
            </div>
            <div className="space-y-1">
              <Label>Tanggal Mulai Berlaku (TMT)</Label>
              <Input type="date" value={tmt} onChange={(e) => setTmt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Catatan (opsional)</Label>
            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="contoh: Kenaikan gaji berkala 2026" rows={2} />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => add.mutate()} disabled={!nominal || !tmt || add.isPending}>
              <Plus className="h-4 w-4 mr-1" /> {add.isPending ? "Menyimpan..." : "Tambahkan"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Riwayat Kenaikan Gaji</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Berlaku</TableHead>
                <TableHead>Gaji Pokok Baru</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kenaikan.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada riwayat kenaikan</TableCell></TableRow>
              ) : kenaikan.map((k: any) => {
                const st = statusKenaikan(k, kenaikan);
                return (
                  <TableRow key={k.id}>
                    <TableCell>{fmtTanggal(k.tanggal_berlaku)}</TableCell>
                    <TableCell>{fmtRp(k.gaji_pokok)}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{k.catatan ?? "—"}</TableCell>
                    <TableCell>
                      {st === "berlaku" ? <Badge>Berlaku</Badge>
                        : st === "terjadwal" ? <Badge variant="secondary">Terjadwal</Badge>
                        : <Badge variant="outline">Riwayat</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus riwayat ini?")) del.mutate(k.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
