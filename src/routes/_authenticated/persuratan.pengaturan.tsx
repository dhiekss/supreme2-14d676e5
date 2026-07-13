import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listKode, upsertKode, deleteKode,
  listNomor, upsertNomor, deleteNomor,
  listPengaturanUmum, savePengaturanUmum,
  runAutoReserveNow,
} from "@/lib/persuratan.functions";

export const Route = createFileRoute("/_authenticated/persuratan/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Persuratan — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Persuratan</h1>
        <p className="text-muted-foreground">Kelola konfigurasi modul persuratan</p>
      </div>

      <Tabs defaultValue="format-nomor">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="format-nomor">Format Nomor</TabsTrigger>
          <TabsTrigger value="kode-surat">Kode Surat</TabsTrigger>
          <TabsTrigger value="diamankan">Surat Diamankan</TabsTrigger>
          <TabsTrigger value="umum">Umum</TabsTrigger>
        </TabsList>

        <TabsContent value="format-nomor" className="mt-4">
          <FormatNomorTab />
        </TabsContent>
        <TabsContent value="kode-surat" className="mt-4">
          <KodeSuratTab />
        </TabsContent>
        <TabsContent value="diamankan" className="mt-4">
          <DiamankanTab />
        </TabsContent>
        <TabsContent value="umum" className="mt-4">
          <UmumTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================= FORMAT NOMOR ================= */
type NomorRow = {
  id: string; jenis_surat: string | null; prefix: string | null;
  format_nomor: string | null; counter: number | null; tahun: number | null;
  contoh_hasil: string | null; is_active: boolean | null;
};

function buildContoh(format: string, counter: number, tahun: number, kodeSample = "421.5") {
  const padded = String(counter).padStart(3, "0");
  return (format || "")
    .replaceAll("{KODE}", kodeSample)
    .replaceAll("{NOMOR}", padded)
    .replaceAll("{TAHUN}", String(tahun))
    .replaceAll("{kode}", kodeSample)
    .replaceAll("{counter}", padded)
    .replaceAll("{tahun}", String(tahun));
}

function FormatNomorTab() {
  const qc = useQueryClient();
  const list = useServerFn(listNomor);
  const save = useServerFn(upsertNomor);
  const del = useServerFn(deleteNomor);
  const { data = [], isLoading } = useQuery({ queryKey: ["persuratan-nomor"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NomorRow | null>(null);
  const [form, setForm] = useState({
    jenisSurat: "", formatNomor: "{KODE}/{NOMOR}/SMKN1.PN-CADISDIK.WIL.IV/{TAHUN}",
    counter: 0, tahun: new Date().getFullYear(), isActive: true,
  });
  const [confirmDel, setConfirmDel] = useState<NomorRow | null>(null);

  const preview = useMemo(
    () => buildContoh(form.formatNomor, form.counter, form.tahun),
    [form.formatNomor, form.counter, form.tahun],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      jenisSurat: "", formatNomor: "{KODE}/{NOMOR}/SMKN1.PN-CADISDIK.WIL.IV/{TAHUN}",
      counter: 0, tahun: new Date().getFullYear(), isActive: true,
    });
    setOpen(true);
  };
  const openEdit = (r: NomorRow) => {
    setEditing(r);
    setForm({
      jenisSurat: r.jenis_surat ?? "",
      formatNomor: r.format_nomor ?? "",
      counter: Number(r.counter ?? 0),
      tahun: Number(r.tahun ?? new Date().getFullYear()),
      isActive: !!r.is_active,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.jenisSurat.trim() || !form.formatNomor.trim()) throw new Error("Jenis dan format wajib diisi");
      await save({
        data: {
          id: editing?.id,
          jenisSurat: form.jenisSurat.trim(),
          formatNomor: form.formatNomor.trim(),
          counter: Number(form.counter) || 0,
          tahun: Number(form.tahun),
          contohHasil: preview,
          isActive: form.isActive,
        },
      });
    },
    onSuccess: () => {
      toast.success("Format nomor tersimpan");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["persuratan-nomor"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Format nomor dihapus");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["persuratan-nomor"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Format Nomor Surat</CardTitle>
          <CardDescription>Kelola format penomoran surat otomatis</CardDescription>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah Format</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-3">Jenis Surat</th>
                <th className="py-3 pr-3">Format</th>
                <th className="py-3 pr-3">Counter</th>
                <th className="py-3 pr-3">Tahun</th>
                <th className="py-3 pr-3">Contoh</th>
                <th className="py-3 pr-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Memuat…</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">Belum ada format nomor.</td></tr>
              )}
              {data.map((r: NomorRow) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-3">{r.jenis_surat}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{r.format_nomor}</td>
                  <td className="py-3 pr-3">{r.counter}</td>
                  <td className="py-3 pr-3">{r.tahun}</td>
                  <td className="py-3 pr-3 font-mono text-xs">{r.contoh_hasil}</td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Format Nomor" : "Tambah Format Nomor"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Surat</Label>
              <Input value={form.jenisSurat} onChange={(e) => setForm({ ...form, jenisSurat: e.target.value })} placeholder="surat_keluar" />
            </div>
            <div className="space-y-2">
              <Label>Format Nomor</Label>
              <Input value={form.formatNomor} onChange={(e) => setForm({ ...form, formatNomor: e.target.value })} className="font-mono" />
              <p className="text-xs text-muted-foreground">Placeholder: <code>{"{KODE}"}</code>, <code>{"{NOMOR}"}</code>, <code>{"{TAHUN}"}</code></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Counter</Label>
                <Input type="number" value={form.counter} onChange={(e) => setForm({ ...form, counter: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input type="number" value={form.tahun} onChange={(e) => setForm({ ...form, tahun: Number(e.target.value) })} />
              </div>
            </div>
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="text-xs text-muted-foreground mb-1">Contoh hasil</div>
              <div className="font-mono text-sm">{preview}</div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus format nomor?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && delMut.mutate(confirmDel.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ================= KODE SURAT ================= */
type KodeRow = {
  id: string; kode: string | null; nama: string | null;
  keterangan: string | null; urutan: number | null; is_active: boolean | null;
};

function KodeSuratTab() {
  const qc = useQueryClient();
  const list = useServerFn(listKode);
  const save = useServerFn(upsertKode);
  const del = useServerFn(deleteKode);
  const { data = [], isLoading } = useQuery({ queryKey: ["persuratan-kode"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KodeRow | null>(null);
  const [form, setForm] = useState({ kode: "", nama: "", keterangan: "", urutan: 0, isActive: true });
  const [confirmDel, setConfirmDel] = useState<KodeRow | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ kode: "", nama: "", keterangan: "", urutan: 0, isActive: true });
    setOpen(true);
  };
  const openEdit = (r: KodeRow) => {
    setEditing(r);
    setForm({
      kode: r.kode ?? "", nama: r.nama ?? "",
      keterangan: r.keterangan ?? "", urutan: Number(r.urutan ?? 0),
      isActive: !!r.is_active,
    });
    setOpen(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.kode.trim() || !form.nama.trim()) throw new Error("Kode dan nama wajib diisi");
      await save({
        data: {
          id: editing?.id,
          kode: form.kode.trim(),
          nama: form.nama.trim(),
          keterangan: form.keterangan.trim() || undefined,
          urutan: Number(form.urutan) || 0,
          isActive: form.isActive,
        },
      });
    },
    onSuccess: () => {
      toast.success("Kode surat tersimpan");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["persuratan-kode"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Kode surat dihapus");
      setConfirmDel(null);
      qc.invalidateQueries({ queryKey: ["persuratan-kode"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus"),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Referensi Kode Surat</CardTitle>
          <CardDescription>Kelola kode klasifikasi surat</CardDescription>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah Kode</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-3">Kode</th>
                <th className="py-3 pr-3">Nama</th>
                <th className="py-3 pr-3">Keterangan</th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Memuat…</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Belum ada kode surat.</td></tr>
              )}
              {data.map((r: KodeRow) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-3 pr-3 font-mono">{r.kode}</td>
                  <td className="py-3 pr-3">{r.nama}</td>
                  <td className="py-3 pr-3 text-muted-foreground">{r.keterangan || "—"}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Aktif" : "Nonaktif"}</Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Kode Surat" : "Tambah Kode Surat"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} placeholder="Contoh: 421.5" />
            </div>
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama/deskripsi kode" />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} placeholder="Keterangan penggunaan" />
            </div>
            <div className="space-y-2">
              <Label>Urutan</Label>
              <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kode surat?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && delMut.mutate(confirmDel.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ================= UMUM ================= */
const UMUM_FIELDS: { key: string; label: string; type?: "text" | "textarea" | "switch"; deskripsi?: string }[] = [
  { key: "nama_instansi", label: "Nama Instansi", deskripsi: "Nama Sekolah" },
  { key: "telepon", label: "Telepon", deskripsi: "Nomor Telepon" },
  { key: "email", label: "Email", deskripsi: "Email Sekolah" },
  { key: "kepala_sekolah", label: "Kepala Sekolah", deskripsi: "Nama Kepala Sekolah" },
  { key: "nip_kepala_sekolah", label: "NIP Kepala Sekolah", deskripsi: "NIP Kepala Sekolah" },
  { key: "pangkat_golongan_kepala", label: "Pangkat/Golongan Kepala", deskripsi: "Pangkat dan golongan Kepala Sekolah" },
  { key: "alamat", label: "Alamat", type: "textarea", deskripsi: "Alamat Sekolah" },
  { key: "auto_numbering", label: "Aktifkan Penomoran Otomatis", type: "switch", deskripsi: "Penomoran Otomatis" },
];

function UmumTab() {
  const qc = useQueryClient();
  const list = useServerFn(listPengaturanUmum);
  const save = useServerFn(savePengaturanUmum);
  const { data = [], isLoading } = useQuery({ queryKey: ["persuratan-umum"], queryFn: () => list() });

  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const r of data as any[]) map[r.key] = r.value ?? "";
    setValues(map);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const items = UMUM_FIELDS.map((f) => ({
        key: f.key,
        value: values[f.key] ?? "",
        deskripsi: f.deskripsi,
      }));
      await save({ data: { items } });
    },
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      qc.invalidateQueries({ queryKey: ["persuratan-umum"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan"),
  });

  const setV = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const textFields = UMUM_FIELDS.filter((f) => f.type !== "textarea" && f.type !== "switch");
  const textareaFields = UMUM_FIELDS.filter((f) => f.type === "textarea");
  const switchFields = UMUM_FIELDS.filter((f) => f.type === "switch");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengaturan Umum</CardTitle>
        <CardDescription>Konfigurasi umum modul persuratan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">Memuat…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {textFields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input value={values[f.key] ?? ""} onChange={(e) => setV(f.key, e.target.value)} />
                </div>
              ))}
            </div>
            {textareaFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Textarea rows={3} value={values[f.key] ?? ""} onChange={(e) => setV(f.key, e.target.value)} />
              </div>
            ))}
            <div className="pt-2 border-t space-y-3">
              {switchFields.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Switch
                    checked={(values[f.key] ?? "false") === "true"}
                    onCheckedChange={(v) => setV(f.key, v ? "true" : "false")}
                  />
                  <Label>{f.label}</Label>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>Simpan Perubahan</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ================= SURAT DIAMANKAN ================= */
const HARI_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Minggu" },
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
];

function DiamankanTab() {
  const qc = useQueryClient();
  const list = useServerFn(listPengaturanUmum);
  const save = useServerFn(savePengaturanUmum);
  const runNow = useServerFn(runAutoReserveNow);
  const { data = [], isLoading } = useQuery({ queryKey: ["persuratan-umum"], queryFn: () => list() });

  const [active, setActive] = useState(true);
  const [count, setCount] = useState(3);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const r of data as any[]) map[r.key] = r.value ?? "";
    setActive((map["reserve_active"] ?? "true") === "true");
    setCount(Number(map["reserve_count_per_day"] ?? 3) || 0);
    try {
      const arr = JSON.parse(map["reserve_days"] ?? "[1,2,3,4,5]");
      if (Array.isArray(arr)) setDays(arr.map((n: any) => Number(n)).filter((n) => n >= 0 && n <= 6));
    } catch { /* ignore */ }
  }, [data]);

  const toggleDay = (d: number) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (count < 0 || count > 50) throw new Error("Jumlah nomor per hari harus 0–50");
      await save({
        data: {
          items: [
            { key: "reserve_active", value: active ? "true" : "false", deskripsi: "Aktifkan pengamanan nomor surat otomatis" },
            { key: "reserve_count_per_day", value: String(count), deskripsi: "Jumlah nomor surat yang diamankan setiap hari" },
            { key: "reserve_days", value: JSON.stringify(days), deskripsi: "Hari aktif pengamanan nomor (0=Minggu ... 6=Sabtu)" },
          ],
        },
      });
    },
    onSuccess: () => {
      toast.success("Pengaturan pengamanan tersimpan");
      qc.invalidateQueries({ queryKey: ["persuratan-umum"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan"),
  });

  const runMut = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (r: any) => {
      const res = r?.result ?? {};
      if (res.skipped) toast.info(`Dilewati: ${res.skipped}`);
      else toast.success(`${res.inserted ?? 0} nomor diamankan (mulai dari ${res.from ?? "-"})`);
      qc.invalidateQueries({ queryKey: ["nomor-diamankan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menjalankan"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pengamanan Nomor Surat Otomatis</CardTitle>
        <CardDescription>
          Sistem akan otomatis mengamankan sejumlah nomor surat setiap pergantian hari,
          hanya pada hari-hari yang dipilih. Nomor yang diamankan tampil di halaman Surat Keluar
          dan dapat langsung digunakan saat membuat surat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">Memuat…</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Aktifkan Pengamanan Otomatis</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Nomor per Hari</Label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Banyaknya nomor yang diamankan setiap hari aktif.</p>
              </div>
              <div className="space-y-2">
                <Label>Kode Surat</Label>
                <Input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="000" />
                <p className="text-xs text-muted-foreground">Kode klasifikasi yang akan diamankan (mis. 000).</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hari Pengamanan</Label>
              <div className="flex flex-wrap gap-2">
                {HARI_OPTIONS.map((h) => {
                  const on = days.includes(h.value);
                  return (
                    <button
                      key={h.value}
                      type="button"
                      onClick={() => toggleDay(h.value)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-accent"
                      }`}
                    >
                      {h.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Klik untuk memilih hari-hari saat sistem akan mengamankan nomor otomatis.
              </p>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium mb-1">Jadwal</div>
              <div className="text-muted-foreground">
                Otomatis dijalankan setiap hari pukul <span className="font-mono">00:05 WIB</span>.
                Nomor hanya akan diamankan bila pengaturan aktif dan hari tersebut termasuk hari pengamanan.
              </div>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
                Jalankan Sekarang
              </Button>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                Simpan Perubahan
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
