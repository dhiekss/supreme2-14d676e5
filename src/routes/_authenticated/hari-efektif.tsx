import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  listHariEfektif, upsertHariEfektif, deleteHariEfektif, summaryHariEfektif,
} from "@/lib/hari-efektif.functions";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/hari-efektif")({
  head: () => ({ meta: [{ title: "Hari Efektif — SUPREME XPOES" }] }),
  loader: async () => ({ items: await listHariEfektif({ data: {} }) }),
  component: HariEfektifPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

const JENIS_LABEL: Record<string, string> = {
  efektif: "Efektif", libur: "Libur", ujian: "Ujian", kegiatan: "Kegiatan",
};
const JENIS_VARIANT: Record<string, any> = {
  efektif: "default", libur: "destructive", ujian: "secondary", kegiatan: "outline",
};

function HariEfektifPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);
  const [jenis, setJenis] = useState("all");

  const qc = useQueryClient();
  const fetchList = useServerFn(listHariEfektif);
  const fetchSum = useServerFn(summaryHariEfektif);
  const removeFn = useServerFn(deleteHariEfektif);

  const { data: items } = useSuspenseQuery({
    queryKey: ["hari-efektif", from, to, jenis],
    queryFn: () => fetchList({ data: { from, to, jenis } }),
  });

  const { data: summary } = useQuery({
    queryKey: ["hari-efektif-sum", from, to],
    queryFn: () => fetchSum({ data: { from, to } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dihapus");
      qc.invalidateQueries({ queryKey: ["hari-efektif"] });
      qc.invalidateQueries({ queryKey: ["hari-efektif-sum"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hari Efektif</h1>
          <p className="text-sm text-muted-foreground">Kalender hari efektif, libur, ujian, & kegiatan.</p>
        </div>
        <FormDialog onSaved={() => {
          qc.invalidateQueries({ queryKey: ["hari-efektif"] });
          qc.invalidateQueries({ queryKey: ["hari-efektif-sum"] });
        }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["efektif", "libur", "ujian", "kegiatan"] as const).map((k) => (
          <Card key={k}>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">{JENIS_LABEL[k]}</div>
              <div className="text-2xl font-bold">{summary?.[k] ?? 0}</div>
              <div className="text-xs text-muted-foreground">hari</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={jenis} onValueChange={setJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="efektif">Efektif</SelectItem>
                  <SelectItem value="libur">Libur</SelectItem>
                  <SelectItem value="ujian">Ujian</SelectItem>
                  <SelectItem value="kegiatan">Kegiatan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Daftar — {items.length}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada data</TableCell></TableRow>
              ) : items.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell>
                    <Badge variant={JENIS_VARIANT[r.jenis] ?? "outline"}>{JENIS_LABEL[r.jenis] ?? r.jenis}</Badge>
                  </TableCell>
                  <TableCell>{r.keterangan ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <FormDialog item={r} onSaved={() => {
                      qc.invalidateQueries({ queryKey: ["hari-efektif"] });
                      qc.invalidateQueries({ queryKey: ["hari-efektif-sum"] });
                    }} />
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FormDialog({ item, onSaved }: { item?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(item?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [jenis, setJenis] = useState(item?.jenis ?? "efektif");
  const [keterangan, setKeterangan] = useState(item?.keterangan ?? "");

  const saveFn = useServerFn(upsertHariEfektif);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { id: item?.id, tanggal, jenis: jenis as any, keterangan } }),
    onSuccess: () => {
      toast.success("Tersimpan");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Edit" : "Tambah"} Hari Efektif</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Jenis</Label>
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efektif">Efektif</SelectItem>
                <SelectItem value="libur">Libur</SelectItem>
                <SelectItem value="ujian">Ujian</SelectItem>
                <SelectItem value="kegiatan">Kegiatan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Keterangan</Label>
            <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
