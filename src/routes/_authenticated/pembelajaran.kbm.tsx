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
import { listKbmOptions, createAgenda } from "@/lib/kbm.functions";
import { ClipboardCheck } from "lucide-react";

const optionsQO = queryOptions({
  queryKey: ["kbm-options"],
  queryFn: () => listKbmOptions(),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/kbm")({
  head: () => ({ meta: [{ title: "Lapor KBM — SUPREME EXPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(optionsQO),
  component: LaporKbmPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

function LaporKbmPage() {
  const { data: opts } = useSuspenseQuery(optionsQO);
  const qc = useQueryClient();
  const create = useServerFn(createAgenda);

  const today = new Date().toISOString().slice(0, 10);
  const initial = {
    tanggal: today,
    rombelId: "",
    mataPelajaranId: "",
    guruId: "",
    jamKe: 1,
    materiDetail: "",
    guruStatus: "Hadir" as "Hadir" | "Izin" | "Sakit" | "Dinas Luar",
  };
  const [form, setForm] = useState(initial);

  const mutation = useMutation({
    mutationFn: (data: typeof form) => create({ data }),
    onSuccess: () => {
      toast.success("Laporan KBM tersimpan");
      qc.invalidateQueries({ queryKey: ["kbm-agenda"] });
      setForm({ ...initial, tanggal: form.tanggal });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rombelId || !form.mataPelajaranId || !form.guruId) {
      toast.error("Lengkapi rombel, mapel, dan guru");
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
        <CardHeader><CardTitle className="text-base">Form Laporan</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Jam Ke</Label>
              <Input type="number" min={1} max={12} value={form.jamKe} onChange={(e) => setForm({ ...form, jamKe: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={form.rombelId} onValueChange={(v) => setForm({ ...form, rombelId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Select value={form.mataPelajaranId} onValueChange={(v) => setForm({ ...form, mataPelajaranId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {opts.mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Guru</Label>
              <Select value={form.guruStatus} onValueChange={(v: any) => setForm({ ...form, guruStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Hadir", "Izin", "Sakit", "Dinas Luar"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Materi / Detail Pembelajaran</Label>
              <Textarea value={form.materiDetail} onChange={(e) => setForm({ ...form, materiDetail: e.target.value })} rows={4} required />
            </div>
            <div className="md:col-span-2">
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
