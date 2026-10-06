import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { izinOptions, listIzin, createIzin, decideIzin, deleteIzin } from "@/lib/izin.functions";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/guru-izin")({
  head: () => ({ meta: [{ title: "Izin Guru — SUPREME XPOES" }] }),
  loader: async () => ({ opts: await izinOptions() }),
  component: IzinPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

function IzinPage() {
  const { opts } = Route.useLoaderData();
  const [status, setStatus] = useState("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listIzin);
  const removeFn = useServerFn(deleteIzin);

  const { data } = useSuspenseQuery({
    queryKey: ["izin", status],
    queryFn: () => fetchList({ data: { status } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { toast.success("Izin dihapus"); qc.invalidateQueries({ queryKey: ["izin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const stBadge = (s?: string | null) => {
    if (s === "disetujui") return <Badge className="bg-green-600">Disetujui</Badge>;
    if (s === "ditolak") return <Badge className="bg-red-600">Ditolak</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Izin Guru</h1>
          <p className="text-sm text-muted-foreground">Pengajuan dan persetujuan izin/sakit/dinas guru.</p>
        </div>
        <IzinFormDialog opts={opts} onSaved={() => qc.invalidateQueries({ queryKey: ["izin"] })} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter Status</CardTitle></CardHeader>
        <CardContent>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="disetujui">Disetujui</SelectItem>
              <SelectItem value="ditolak">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Daftar Izin — {data.length}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Guru</th>
                <th className="text-left p-3">Jenis</th>
                <th className="text-left p-3">Periode</th>
                <th className="text-left p-3">Alasan</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.guru_nama}</td>
                  <td className="p-3 capitalize">{r.jenis_izin}</td>
                  <td className="p-3 text-xs">
                    <div>{r.tanggal_mulai}</div>
                    <div className="text-muted-foreground">s/d {r.tanggal_selesai}</div>
                  </td>
                  <td className="p-3 max-w-xs">
                    <div className="truncate" title={r.alasan}>{r.alasan}</div>
                    {r.catatan_admin && <div className="text-xs text-muted-foreground mt-1 italic">Admin: {r.catatan_admin}</div>}
                  </td>
                  <td className="p-3">{stBadge(r.status)}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {r.status === "pending" && (
                        <DecideDialog id={r.id} onSaved={() => qc.invalidateQueries({ queryKey: ["izin"] })} />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus pengajuan?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada pengajuan.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function IzinFormDialog({ opts, onSaved }: { opts: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    guruId: "",
    tanggalMulai: new Date().toISOString().slice(0, 10),
    tanggalSelesai: new Date().toISOString().slice(0, 10),
    jenisIzin: "izin" as "sakit" | "izin" | "dinas" | "cuti",
    alasan: "",
  });
  const fn = useServerFn(createIzin);

  const save = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { toast.success("Pengajuan disimpan"); setOpen(false); setForm({ ...form, alasan: "" }); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.guruId) return toast.error("Pilih guru");
    if (form.alasan.length < 3) return toast.error("Alasan minimal 3 karakter");
    if (form.tanggalSelesai < form.tanggalMulai) return toast.error("Tanggal selesai tidak valid");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Ajukan Izin</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Pengajuan Izin Guru</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Guru</Label>
            <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>{opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Jenis</Label>
            <Select value={form.jenisIzin} onValueChange={(v) => setForm({ ...form, jenisIzin: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sakit">Sakit</SelectItem>
                <SelectItem value="izin">Izin</SelectItem>
                <SelectItem value="dinas">Dinas</SelectItem>
                <SelectItem value="cuti">Cuti</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mulai</Label>
              <Input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Selesai</Label>
              <Input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Alasan</Label>
            <Textarea rows={3} value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<"disetujui" | "ditolak">("disetujui");
  const [catatan, setCatatan] = useState("");
  const fn = useServerFn(decideIzin);
  const m = useMutation({
    mutationFn: () => fn({ data: { id, decision, catatan } }),
    onSuccess: () => { toast.success("Keputusan tersimpan"); setOpen(false); setCatatan(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Proses</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Proses Pengajuan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={decision === "disetujui" ? "default" : "outline"} onClick={() => setDecision("disetujui")} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui
            </Button>
            <Button variant={decision === "ditolak" ? "default" : "outline"} onClick={() => setDecision("ditolak")} className="flex-1">
              <XCircle className="h-4 w-4 mr-1" /> Tolak
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Catatan admin (opsional)</Label>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
