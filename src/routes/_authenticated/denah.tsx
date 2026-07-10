import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  listDenah, saveRuang, deleteRuang, saveJenisRuang, deleteJenisRuang,
} from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Ruang = {
  id: string; nama: string | null; kode_ruang: string | null; kapasitas: number | null;
  jenis_ruang_id: string | null; rombel_id: string | null; jenis_nama?: string; rombel_nama?: string;
  denah_posisi_x: number | null; denah_posisi_y: number | null;
};
type Jenis = { id: string; nama: string | null; keterangan: string | null; is_kelas: boolean | null };

export const Route = createFileRoute("/_authenticated/denah")({
  head: () => ({ meta: [{ title: "Manajemen Denah — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listDenah);
  const sR = useServerFn(saveRuang);
  const dR = useServerFn(deleteRuang);
  const sJ = useServerFn(saveJenisRuang);
  const dJ = useServerFn(deleteJenisRuang);

  const { data } = useQuery({
    queryKey: ["denah"],
    queryFn: () => fetchFn() as Promise<{ ruang: Ruang[]; jenis: Jenis[]; rombel: { id: string; name: string }[] }>,
  });
  const ruang = data?.ruang ?? [];
  const jenis = data?.jenis ?? [];
  const rombel = data?.rombel ?? [];

  const [editR, setEditR] = useState<Partial<Ruang> | null>(null);
  const [editJ, setEditJ] = useState<Partial<Jenis> | null>(null);

  const mR = useMutation({ mutationFn: (v: any) => sR({ data: v }), onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["denah"] }); setEditR(null); }, onError: (e: any) => toast.error(e.message) });
  const mJ = useMutation({ mutationFn: (v: any) => sJ({ data: v }), onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["denah"] }); setEditJ(null); }, onError: (e: any) => toast.error(e.message) });
  const delRm = useMutation({ mutationFn: (id: string) => dR({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["denah"] }), onError: (e: any) => toast.error(e.message) });
  const delJn = useMutation({ mutationFn: (id: string) => dJ({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["denah"] }), onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Denah</h1>
        <p className="text-sm text-muted-foreground">Kelola ruang & jenis ruang untuk denah sekolah.</p>
      </div>
      <Tabs defaultValue="ruang">
        <TabsList>
          <TabsTrigger value="ruang">Ruang</TabsTrigger>
          <TabsTrigger value="jenis">Jenis Ruang</TabsTrigger>
        </TabsList>

        <TabsContent value="ruang">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daftar Ruang</CardTitle>
              <Button size="sm" onClick={() => setEditR({})}><Plus className="h-4 w-4 mr-1" />Tambah Ruang</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Jenis</TableHead><TableHead>Rombel</TableHead><TableHead>Kapasitas</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ruang.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>}
                  {ruang.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.kode_ruang ?? "—"}</TableCell>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell>{r.jenis_nama ?? "—"}</TableCell>
                      <TableCell>{r.rombel_nama ?? "—"}</TableCell>
                      <TableCell>{r.kapasitas ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditR(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delRm.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jenis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Jenis Ruang</CardTitle>
              <Button size="sm" onClick={() => setEditJ({})}><Plus className="h-4 w-4 mr-1" />Tambah Jenis</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nama</TableHead><TableHead>Keterangan</TableHead><TableHead>Kelas?</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {jenis.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>}
                  {jenis.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.nama}</TableCell>
                      <TableCell>{j.keterangan ?? "—"}</TableCell>
                      <TableCell>{j.is_kelas ? <Badge>Ya</Badge> : <Badge variant="outline">Tidak</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditJ(j)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => delJn.mutate(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editR} onOpenChange={(o) => !o && setEditR(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editR?.id ? "Edit" : "Tambah"} Ruang</DialogTitle></DialogHeader>
          {editR && (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Kode</Label><Input value={editR.kode_ruang ?? ""} onChange={(e) => setEditR({ ...editR, kode_ruang: e.target.value })} /></div>
                <div className="col-span-2"><Label>Nama *</Label><Input value={editR.nama ?? ""} onChange={(e) => setEditR({ ...editR, nama: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jenis Ruang</Label>
                  <Select value={editR.jenis_ruang_id ?? ""} onValueChange={(v) => setEditR({ ...editR, jenis_ruang_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                    <SelectContent>{jenis.map((j) => <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rombel</Label>
                  <Select value={editR.rombel_id ?? ""} onValueChange={(v) => setEditR({ ...editR, rombel_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                    <SelectContent>{rombel.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Kapasitas</Label><Input type="number" value={editR.kapasitas ?? ""} onChange={(e) => setEditR({ ...editR, kapasitas: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Pos X</Label><Input type="number" step="0.01" value={editR.denah_posisi_x ?? ""} onChange={(e) => setEditR({ ...editR, denah_posisi_x: e.target.value ? Number(e.target.value) : null })} /></div>
                <div><Label>Pos Y</Label><Input type="number" step="0.01" value={editR.denah_posisi_y ?? ""} onChange={(e) => setEditR({ ...editR, denah_posisi_y: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditR(null)}>Batal</Button>
            <Button disabled={mR.isPending || !editR?.nama} onClick={() => mR.mutate({
              id: editR?.id,
              nama: editR?.nama,
              kode_ruang: editR?.kode_ruang || null,
              kapasitas: editR?.kapasitas ?? null,
              jenis_ruang_id: editR?.jenis_ruang_id || null,
              rombel_id: editR?.rombel_id || null,
              denah_posisi_x: editR?.denah_posisi_x ?? null,
              denah_posisi_y: editR?.denah_posisi_y ?? null,
            })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editJ} onOpenChange={(o) => !o && setEditJ(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editJ?.id ? "Edit" : "Tambah"} Jenis Ruang</DialogTitle></DialogHeader>
          {editJ && (
            <div className="grid gap-3">
              <div><Label>Nama *</Label><Input value={editJ.nama ?? ""} onChange={(e) => setEditJ({ ...editJ, nama: e.target.value })} /></div>
              <div><Label>Keterangan</Label><Input value={editJ.keterangan ?? ""} onChange={(e) => setEditJ({ ...editJ, keterangan: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={!!editJ.is_kelas} onCheckedChange={(v) => setEditJ({ ...editJ, is_kelas: v })} /><Label>Digunakan sebagai kelas</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditJ(null)}>Batal</Button>
            <Button disabled={mJ.isPending || !editJ?.nama} onClick={() => mJ.mutate({ id: editJ?.id, nama: editJ?.nama, keterangan: editJ?.keterangan || null, is_kelas: !!editJ?.is_kelas })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
