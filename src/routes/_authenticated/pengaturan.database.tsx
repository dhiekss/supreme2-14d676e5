import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { listSettings, upsertSetting, deleteSetting } from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/pengaturan/database")({
  head: () => ({ meta: [{ title: "Pengaturan — SUPREME XPOES" }] }),
  component: PengaturanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

function PengaturanPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listSettings);
  const delFn = useServerFn(deleteSetting);

  const { data } = useSuspenseQuery({ queryKey: ["settings"], queryFn: () => fetchList() });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Pengaturan dihapus"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Aplikasi</h1>
          <p className="text-sm text-muted-foreground">Kelola key-value konfigurasi sistem.</p>
        </div>
        <SettingFormDialog onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Daftar Pengaturan — {data.length}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Key</th>
                <th className="text-left p-3">Value</th>
                <th className="text-left p-3">Deskripsi</th>
                <th className="text-right p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.key}</td>
                  <td className="p-3 max-w-sm"><div className="line-clamp-2 text-xs">{r.value}</div></td>
                  <td className="p-3 text-xs text-muted-foreground">{r.description}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <SettingFormDialog initial={r} onSaved={() => qc.invalidateQueries({ queryKey: ["settings"] })} />
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus pengaturan?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Belum ada pengaturan.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingFormDialog({ initial, onSaved }: { initial?: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: initial?.id as string | undefined,
    key: initial?.key ?? "",
    value: initial?.value ?? "",
    description: initial?.description ?? "",
  });
  const saveFn = useServerFn(upsertSetting);
  const save = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Disimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });
  const submit = () => {
    if (!form.key) return toast.error("Key wajib");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && initial) setForm({ id: initial.id, key: initial.key ?? "", value: initial.value ?? "", description: initial.description ?? "" }); }}>
      <DialogTrigger asChild>
        {initial
          ? <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
          : <Button><Plus className="h-4 w-4 mr-1" /> Tambah</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Tambah"} Pengaturan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Key</Label>
            <Input placeholder="contoh: wa_api_url" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Value</Label>
            <Textarea rows={3} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
