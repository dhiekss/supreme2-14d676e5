import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { listJadwal, jadwalOptions, createJadwal, deleteJadwal, clearJadwal } from "@/lib/jadwal.functions";
import { Trash2, Plus, Eraser } from "lucide-react";
import { toast } from "sonner";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

export const Route = createFileRoute("/_authenticated/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal Pelajaran — SUPREME XPOES" }] }),
  loader: async () => ({ opts: await jadwalOptions() }),
  component: JadwalPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function JadwalPage() {
  const { opts } = Route.useLoaderData();
  const [filterRombel, setFilterRombel] = useState<string>(opts.rombel[0]?.id ?? "");
  const [filterGuru, setFilterGuru] = useState<string>("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listJadwal);
  const removeFn = useServerFn(deleteJadwal);

  const { data } = useSuspenseQuery({
    queryKey: ["jadwal", filterRombel, filterGuru],
    queryFn: () => fetchList({
      data: {
        rombelId: filterRombel || undefined,
        guruId: filterGuru === "all" ? undefined : filterGuru,
      },
    }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { toast.success("Jadwal dihapus"); qc.invalidateQueries({ queryKey: ["jadwal"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // grouped by hari -> jam_ke
  const grid = useMemo(() => {
    const maxJam = Math.max(8, ...data.map((d) => Number(d.jam_ke ?? 0)));
    const cells: Record<string, Record<number, any[]>> = {};
    for (const h of HARI) cells[h] = {};
    for (const r of data) {
      const h = r.hari as string;
      const j = Number(r.jam_ke ?? 0);
      if (!HARI.includes(h as any)) continue;
      cells[h][j] = cells[h][j] || [];
      cells[h][j].push(r);
    }
    return { cells, maxJam };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Kelola jadwal mingguan per rombel & guru.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ClearJadwalDialog
            rombelId={filterRombel}
            guruId={filterGuru === "all" ? undefined : filterGuru}
            rombelName={opts.rombel.find((r: any) => r.id === filterRombel)?.name}
            onDone={() => qc.invalidateQueries({ queryKey: ["jadwal"] })}
          />
          <JadwalFormDialog opts={opts} onCreated={() => qc.invalidateQueries({ queryKey: ["jadwal"] })} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={filterRombel} onValueChange={setFilterRombel}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={filterGuru} onValueChange={setFilterGuru}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua guru</SelectItem>
                  {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Matriks Jadwal — {data.length} slot</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left w-16">Jam</th>
                {HARI.map((h) => <th key={h} className="border p-2 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: grid.maxJam }, (_, i) => i + 1).map((jam) => (
                <tr key={jam}>
                  <td className="border p-2 font-medium align-top bg-muted/30">{jam}</td>
                  {HARI.map((h) => (
                    <td key={h} className="border p-2 align-top min-w-[160px]">
                      {(grid.cells[h][jam] ?? []).map((s: any) => (
                        <div key={s.id} className="mb-1 last:mb-0 group rounded border bg-card p-2 text-xs">
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-medium leading-tight">{s.mapel_nama}</div>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={() => { if (confirm("Hapus slot?")) del.mutate(s.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-muted-foreground leading-tight">{s.guru_nama}</div>
                          <div className="text-muted-foreground leading-tight">{s.rombel_name}</div>
                          {(s.jam_mulai || s.jam_selesai) && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {s.jam_mulai ?? ""}–{s.jam_selesai ?? ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function JadwalFormDialog({ opts, onCreated }: { opts: any; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    hari: "Senin" as (typeof HARI)[number],
    jamKe: 1,
    jamMulai: "",
    jamSelesai: "",
    rombelId: "",
    mataPelajaranId: "",
    guruId: "",
  });
  const createFn = useServerFn(createJadwal);

  // auto-fill jam_mulai/jam_selesai from alokasi when available
  const matchAlokasi = (hari: string, jamKe: number) => {
    const a = opts.alokasi.find((x: any) => x.hari === hari && Number(x.jam_ke) === jamKe);
    if (a) setForm((f) => ({ ...f, jamMulai: a.jam_mulai ?? "", jamSelesai: a.jam_selesai ?? "" }));
  };

  const create = useMutation({
    mutationFn: () => createFn({ data: form }),
    onSuccess: () => {
      toast.success("Slot ditambahkan");
      setOpen(false);
      setForm({ ...form, mataPelajaranId: "", guruId: "" });
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.rombelId || !form.mataPelajaranId || !form.guruId) return toast.error("Lengkapi semua kolom");
    create.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Tambah Slot</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Slot Jadwal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hari</Label>
              <Select value={form.hari} onValueChange={(v) => { setForm({ ...form, hari: v as any }); matchAlokasi(v, form.jamKe); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{HARI.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Jam ke-</Label>
              <Input type="number" min={1} max={20} value={form.jamKe} onChange={(e) => { const v = Number(e.target.value); setForm({ ...form, jamKe: v }); matchAlokasi(form.hari, v); }} />
            </div>
            <div className="space-y-1">
              <Label>Jam Mulai</Label>
              <Input type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Jam Selesai</Label>
              <Input type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Rombel</Label>
            <Select value={form.rombelId} onValueChange={(v) => setForm({ ...form, rombelId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>{opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Mata Pelajaran</Label>
            <Select value={form.mataPelajaranId} onValueChange={(v) => setForm({ ...form, mataPelajaranId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
              <SelectContent>{opts.mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Guru</Label>
            <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>{opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}</SelectContent>
            </Select>
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

function ClearJadwalDialog({
  rombelId, guruId, rombelName, onDone,
}: { rombelId: string; guruId?: string; rombelName?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const clearFn = useServerFn(clearJadwal);

  const run = useMutation({
    mutationFn: () => clearFn({ data: { rombelId: rombelId || undefined, guruId, scope } }),
    onSuccess: (r: any) => {
      toast.success(`${r.deleted ?? 0} slot dihapus`);
      setOpen(false);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Eraser className="h-4 w-4 mr-1" /> Hapus Semua Jadwal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Jadwal</DialogTitle>
          <DialogDescription>
            Pilih cakupan penghapusan. Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input type="radio" name="scope" checked={scope === "filtered"} onChange={() => setScope("filtered")} className="mt-1" />
            <div>
              <div className="font-medium">Hanya sesuai filter aktif</div>
              <div className="text-xs text-muted-foreground">
                Rombel: {rombelName ?? "—"}{guruId ? " • Guru dipilih" : ""}
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} className="mt-1" />
            <div>
              <div className="font-medium text-destructive">Semua jadwal (seluruh rombel & guru)</div>
              <div className="text-xs text-muted-foreground">Menghapus SEMUA slot jadwal pada database.</div>
            </div>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="destructive" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
