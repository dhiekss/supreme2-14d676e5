import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { berkasOptions, listBerkas, upsertBerkas, reviewBerkas, deleteBerkas } from "@/lib/berkas.functions";
import { Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/berkas")({
  head: () => ({ meta: [{ title: "Berkas Pembelajaran — SUPREME XPOES" }] }),
  loader: async () => ({ opts: await berkasOptions() }),
  component: BerkasPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

function BerkasPage() {
  const { opts } = Route.useLoaderData();
  const [filterGuru, setFilterGuru] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listBerkas);
  const removeFn = useServerFn(deleteBerkas);

  const { data } = useSuspenseQuery({
    queryKey: ["berkas", filterGuru, filterStatus],
    queryFn: () => fetchList({ data: { guruId: filterGuru === "all" ? undefined : filterGuru, status: filterStatus } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { toast.success("Berkas dihapus"); qc.invalidateQueries({ queryKey: ["berkas"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const statusBadge = (s?: string | null) => {
    if (s === "disetujui") return <Badge className="bg-green-600">Disetujui</Badge>;
    if (s === "perbaikan") return <Badge className="bg-red-600">Perbaikan</Badge>;
    return <Badge variant="secondary">Menunggu</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Berkas Pembelajaran</h1>
          <p className="text-sm text-muted-foreground">Prota, Promes, ATP, dan Modul Ajar per guru & rombel mapel.</p>
        </div>
        <BerkasFormDialog opts={opts} onSaved={() => qc.invalidateQueries({ queryKey: ["berkas"] })} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="menunggu">Menunggu</SelectItem>
                  <SelectItem value="disetujui">Disetujui</SelectItem>
                  <SelectItem value="perbaikan">Perbaikan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Daftar Berkas — {data.length}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Guru</th>
                <th className="text-left p-3">Rombel / Mapel</th>
                <th className="text-left p-3">Dokumen</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.guru_nama}</td>
                  <td className="p-3">
                    <div className="font-medium">{r.mapel_nama}</div>
                    <div className="text-xs text-muted-foreground">{r.rombel_name}</div>
                  </td>
                  <td className="p-3 space-y-1">
                    {[
                      ["Prota", r.prota_link],
                      ["Promes", r.promes_link],
                      ["ATP", r.atp_link],
                      ["Modul", r.modul_ajar_link],
                    ].map(([label, url]) => url ? (
                      <a key={label as string} href={url as string} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> {label}
                      </a>
                    ) : null)}
                  </td>
                  <td className="p-3">
                    {statusBadge(r.status)}
                    {r.catatan_perbaikan && <div className="text-xs text-muted-foreground mt-1">{r.catatan_perbaikan}</div>}
                    {r.diperiksa_oleh_nama && <div className="text-[10px] text-muted-foreground">oleh {r.diperiksa_oleh_nama}</div>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <ReviewDialog id={r.id} onSaved={() => qc.invalidateQueries({ queryKey: ["berkas"] })} />
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus berkas?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada berkas.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function BerkasFormDialog({ opts, onSaved }: { opts: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rombelMataPelajaranId: "",
    guruId: "",
    protaLink: "",
    promesLink: "",
    atpLink: "",
    modulAjarLink: "",
  });
  const saveFn = useServerFn(upsertBerkas);

  const rmpOptions = useMemo(() => {
    const rombelMap = new Map(opts.rombel.map((r: any) => [r.id, r.name]));
    const mapelMap = new Map(opts.mapel.map((m: any) => [m.id, m.nama]));
    return opts.rmp.map((x: any) => ({
      id: x.id,
      guruId: x.guru_id,
      label: `${mapelMap.get(x.mata_pelajaran_id) ?? "?"} — ${rombelMap.get(x.rombel_id) ?? "?"}`,
    }));
  }, [opts]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Berkas disimpan"); setOpen(false); setForm({ rombelMataPelajaranId: "", guruId: "", protaLink: "", promesLink: "", atpLink: "", modulAjarLink: "" }); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.rombelMataPelajaranId || !form.guruId) return toast.error("Pilih rombel-mapel dan guru");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Tambah Berkas</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Berkas Pembelajaran</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rombel — Mata Pelajaran</Label>
            <Select value={form.rombelMataPelajaranId} onValueChange={(v) => {
              const item = rmpOptions.find((x: any) => x.id === v);
              setForm({ ...form, rombelMataPelajaranId: v, guruId: item?.guruId ?? form.guruId });
            }}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{rmpOptions.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Guru</Label>
            <Select value={form.guruId} onValueChange={(v) => setForm({ ...form, guruId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
              <SelectContent>{opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {[
            ["protaLink", "Link Prota"],
            ["promesLink", "Link Promes"],
            ["atpLink", "Link ATP"],
            ["modulAjarLink", "Link Modul Ajar"],
          ].map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label>{label}</Label>
              <Input placeholder="https://..." value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"disetujui" | "perbaikan">("disetujui");
  const [catatan, setCatatan] = useState("");
  const reviewFn = useServerFn(reviewBerkas);
  const m = useMutation({
    mutationFn: () => reviewFn({ data: { id, status, catatan } }),
    onSuccess: () => { toast.success("Review tersimpan"); setOpen(false); setCatatan(""); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm">Review</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Review Berkas</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant={status === "disetujui" ? "default" : "outline"} onClick={() => setStatus("disetujui")} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Setujui
            </Button>
            <Button variant={status === "perbaikan" ? "default" : "outline"} onClick={() => setStatus("perbaikan")} className="flex-1">
              <AlertCircle className="h-4 w-4 mr-1" /> Perbaikan
            </Button>
          </div>
          {status === "perbaikan" && (
            <div className="space-y-1">
              <Label>Catatan perbaikan</Label>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
