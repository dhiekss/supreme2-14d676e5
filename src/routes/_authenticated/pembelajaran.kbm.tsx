import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { listLaporanKbmOptions, createLaporanKbm } from "@/lib/lapor-kbm.functions";
import { ClipboardCheck } from "lucide-react";

const optionsQO = queryOptions({
  queryKey: ["lapor-kbm-options"],
  queryFn: () => listLaporanKbmOptions(),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/kbm")({
  head: () => ({ meta: [{ title: "Lapor KBM — SUPREME EXPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optionsQO),
  component: LaporKbmPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

const STATUS = ["Hadir", "Izin", "Sakit", "Dinas Luar"] as const;

function LaporKbmPage() {
  const { data: opts } = useSuspenseQuery(optionsQO);
  const qc = useQueryClient();
  const create = useServerFn(createLaporanKbm);

  const today = new Date().toISOString().slice(0, 10);
  const initial = {
    tanggal: today,
    jam_mulai: 1,
    jam_selesai: 1,
    rombel_id: "",
    mata_pelajaran_id: "",
    guru_id: "",
    guru_status: "Hadir" as (typeof STATUS)[number],
    materi: "",
    capaian_pembelajaran: "",
    jumlah_hadir: 0,
    jumlah_izin: 0,
    jumlah_sakit: 0,
    jumlah_alpa: 0,
    catatan: "",
  };
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => create({ data }),
    onSuccess: () => {
      toast.success("Laporan KBM tersimpan");
      qc.invalidateQueries({ queryKey: ["lapor-kbm-list"] });
      setForm({ ...initial, tanggal: form.tanggal });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rombel_id || !form.mata_pelajaran_id || !form.guru_id) {
      toast.error("Lengkapi rombel, mapel, dan guru");
      return;
    }
    if (form.jam_selesai < form.jam_mulai) {
      toast.error("Jam selesai tidak boleh lebih kecil dari jam mulai");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Lapor KBM
        </h1>
        <p className="text-sm text-muted-foreground">Catat pelaksanaan Kegiatan Belajar Mengajar harian.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 grid-cols-1 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Jam Mulai</Label>
              <Input type="number" min={1} max={12} value={form.jam_mulai} onChange={(e) => set("jam_mulai", Number(e.target.value))} required />
            </div>
            <div className="space-y-2">
              <Label>Jam Selesai</Label>
              <Input type="number" min={1} max={12} value={form.jam_selesai} onChange={(e) => set("jam_selesai", Number(e.target.value))} required />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Rombel</Label>
              <Select value={form.rombel_id} onValueChange={(v) => set("rombel_id", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Mata Pelajaran</Label>
              <Select value={form.mata_pelajaran_id} onValueChange={(v) => set("mata_pelajaran_id", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {opts.mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Guru Pengajar</Label>
              <Select value={form.guru_id} onValueChange={(v) => set("guru_id", v)}>
                <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Status Guru</Label>
              <Select value={form.guru_status} onValueChange={(v: any) => set("guru_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label>Materi</Label>
              <Textarea value={form.materi} onChange={(e) => set("materi", e.target.value)} rows={3} />
            </div>
            <div className="space-y-2 md:col-span-4">
              <Label>Capaian Pembelajaran</Label>
              <Textarea value={form.capaian_pembelajaran} onChange={(e) => set("capaian_pembelajaran", e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Hadir</Label>
              <Input type="number" min={0} value={form.jumlah_hadir} onChange={(e) => set("jumlah_hadir", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Izin</Label>
              <Input type="number" min={0} value={form.jumlah_izin} onChange={(e) => set("jumlah_izin", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Sakit</Label>
              <Input type="number" min={0} value={form.jumlah_sakit} onChange={(e) => set("jumlah_sakit", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Alpa</Label>
              <Input type="number" min={0} value={form.jumlah_alpa} onChange={(e) => set("jumlah_alpa", Number(e.target.value))} />
            </div>

            <div className="space-y-2 md:col-span-4">
              <Label>Catatan</Label>
              <Textarea value={form.catatan} onChange={(e) => set("catatan", e.target.value)} rows={2} />
            </div>

            <div className="md:col-span-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Menyimpan..." : "Simpan Laporan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
