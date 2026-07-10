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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listAgenda, listKbmOptions, createAgenda } from "@/lib/kbm.functions";
import { Plus } from "lucide-react";

const agendaQO = queryOptions({
  queryKey: ["kbm-agenda"],
  queryFn: () => listAgenda({ data: { limit: 50 } }),
});
const optionsQO = queryOptions({
  queryKey: ["kbm-options"],
  queryFn: () => listKbmOptions(),
});

export const Route = createFileRoute("/_authenticated/kbm")({
  head: () => ({ meta: [{ title: "KBM — SUPREME XPOES" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(agendaQO),
      context.queryClient.ensureQueryData(optionsQO),
    ]),
  component: KbmPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal memuat: {error.message}</div>,
});

function KbmPage() {
  const { data: agenda } = useSuspenseQuery(agendaQO);
  const { data: opts } = useSuspenseQuery(optionsQO);
  const qc = useQueryClient();
  const create = useServerFn(createAgenda);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tanggal: today,
    rombelId: "",
    mataPelajaranId: "",
    guruId: "",
    jamKe: 1,
    materiDetail: "",
    guruStatus: "Hadir" as "Hadir" | "Izin" | "Sakit" | "Dinas Luar",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => create({ data }),
    onSuccess: () => {
      toast.success("Agenda KBM tersimpan");
      qc.invalidateQueries({ queryKey: ["kbm-agenda"] });
      setOpen(false);
      setForm({ ...form, materiDetail: "" });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kegiatan Belajar Mengajar</h1>
          <p className="text-sm text-muted-foreground">Agenda dan laporan harian KBM.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          {open ? "Tutup" : "Tambah Agenda"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardHeader><CardTitle className="text-base">Agenda Baru</CardTitle></CardHeader>
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
                <Textarea value={form.materiDetail} onChange={(e) => setForm({ ...form, materiDetail: e.target.value })} rows={3} required />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Menyimpan..." : "Simpan Agenda"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Agenda Terbaru ({agenda.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Mapel</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Materi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agenda.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada agenda</TableCell></TableRow>
              )}
              {agenda.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{a.tanggal}</TableCell>
                  <TableCell>{a.jam_ke ?? "—"}</TableCell>
                  <TableCell>{a.rombel_name}</TableCell>
                  <TableCell>{a.mapel_name}</TableCell>
                  <TableCell>{a.guru_name}</TableCell>
                  <TableCell>
                    <Badge variant={a.guru_status === "Hadir" ? "default" : "secondary"}>{a.guru_status ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{a.materi_detail ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
