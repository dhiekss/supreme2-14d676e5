import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { upsertReferensi, upsertLaporan } from "@/lib/tpg.functions";

export const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
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

export function LaporanFormDialog({ guru, referensi, item, onSaved }: { guru: any[]; referensi: any[]; item?: any; onSaved: () => void }) {
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
