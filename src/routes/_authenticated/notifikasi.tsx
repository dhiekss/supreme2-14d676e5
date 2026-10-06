import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  listNotifikasi,
  createNotifikasi,
  updateNotifikasiStatus,
  deleteNotifikasi,
  summaryNotifikasi,
} from "@/lib/notifikasi.functions";

export const Route = createFileRoute("/_authenticated/notifikasi")({
  head: () => ({ meta: [{ title: "Notifikasi WA — SUPREME XPOES" }] }),
  component: NotifikasiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

const TYPES = ["umum", "presensi", "izin", "sp", "tpg", "persuratan", "perpus"];

function NotifikasiPage() {
  const qc = useQueryClient();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const fetchList = useServerFn(listNotifikasi);
  const fetchSum = useServerFn(summaryNotifikasi);
  const updFn = useServerFn(updateNotifikasiStatus);
  const delFn = useServerFn(deleteNotifikasi);

  const { data } = useSuspenseQuery({
    queryKey: ["notifikasi", type, status],
    queryFn: () => fetchList({ data: { type, status } }),
  });
  const { data: sum } = useQuery({ queryKey: ["notifikasi-sum"], queryFn: () => fetchSum() });

  const upd = useMutation({
    mutationFn: (v: { id: string; status: string }) => updFn({ data: v }),
    onSuccess: () => { toast.success("Status diperbarui"); qc.invalidateQueries({ queryKey: ["notifikasi"] }); qc.invalidateQueries({ queryKey: ["notifikasi-sum"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["notifikasi"] }); qc.invalidateQueries({ queryKey: ["notifikasi-sum"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const badge = (s?: string | null) => {
    if (s === "sent" || s === "delivered") return <Badge className="bg-green-600">Terkirim</Badge>;
    if (s === "failed") return <Badge variant="destructive">Gagal</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifikasi WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Log pengiriman notifikasi WA dan komposer pesan.</p>
        </div>
        <ComposerDialog onSaved={() => { qc.invalidateQueries({ queryKey: ["notifikasi"] }); qc.invalidateQueries({ queryKey: ["notifikasi-sum"] }); }} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Total", sum?.total ?? 0],
          ["Pending", sum?.pending ?? 0],
          ["Terkirim", sum?.sent ?? 0],
          ["Gagal", sum?.failed ?? 0],
        ].map(([l, v]) => (
          <Card key={l as string}><CardContent className="pt-6"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold">{v as number}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Log Notifikasi — {data.length}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Waktu</th>
                <th className="text-left p-3">Tipe</th>
                <th className="text-left p-3">Penerima</th>
                <th className="text-left p-3">Pesan</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                  <td className="p-3"><Badge variant="outline">{r.type ?? "-"}</Badge></td>
                  <td className="p-3">
                    <div className="font-medium">{r.recipient_name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{r.recipient_phone ?? "-"}</div>
                  </td>
                  <td className="p-3 max-w-md"><div className="line-clamp-2 text-xs">{r.message}</div></td>
                  <td className="p-3">{badge(r.status)}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => upd.mutate({ id: r.id, status: "sent" })}>Tandai Terkirim</Button>
                          <Button variant="outline" size="sm" onClick={() => upd.mutate({ id: r.id, status: "failed" })}>Gagal</Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus log?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada notifikasi.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ComposerDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "umum", recipientPhone: "", recipientName: "", message: "" });
  const saveFn = useServerFn(createNotifikasi);
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Notifikasi diantrikan"); setOpen(false); setForm({ type: "umum", recipientPhone: "", recipientName: "", message: "" }); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.recipientPhone || !form.message) return toast.error("Nomor & pesan wajib");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Komposer</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Kirim Notifikasi WA</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Tipe</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nomor WA</Label>
            <Input placeholder="628xxxx" value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Nama Penerima</Label>
            <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Pesan</Label>
            <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>
            <Send className="h-4 w-4 mr-1" />
            {save.isPending ? "Mengirim..." : "Antrikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
