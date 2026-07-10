import { createFileRoute, useSearch } from "@tanstack/react-router";
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
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import {
  listPeriode, saveTahunAjaran, deleteTahunAjaran,
  saveSemester, deleteSemester,
} from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Tahun = { id: string; nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null; is_active: boolean | null };
type Sem = { id: string; tahun_ajaran_id: string | null; nama: string | null; tanggal_mulai: string | null; tanggal_selesai: string | null; is_active: boolean | null };

export const Route = createFileRoute("/_authenticated/periode")({
  head: () => ({ meta: [{ title: "Manajemen Periode — SUPREME XPOES" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab === "semester" ? "semester" : "tahun") as "tahun" | "semester" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { tab } = useSearch({ from: "/_authenticated/periode" });
  return <Page defaultTab={tab} />;
}

export function Page({ defaultTab = "tahun" }: { defaultTab?: "tahun" | "semester" }) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listPeriode);
  const saveT = useServerFn(saveTahunAjaran);
  const delT = useServerFn(deleteTahunAjaran);
  const saveS = useServerFn(saveSemester);
  const delS = useServerFn(deleteSemester);

  const { data } = useQuery({ queryKey: ["periode"], queryFn: () => fetchFn() as Promise<{ tahun: Tahun[]; semester: Sem[] }> });
  const tahun = data?.tahun ?? [];
  const semester = data?.semester ?? [];
  const tahunMap = new Map(tahun.map((t) => [t.id, t.nama ?? "—"]));

  const [editT, setEditT] = useState<Partial<Tahun> | null>(null);
  const [editS, setEditS] = useState<Partial<Sem> | null>(null);

  const mT = useMutation({
    mutationFn: (v: any) => saveT({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["periode"] }); setEditT(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const mS = useMutation({
    mutationFn: (v: any) => saveS({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["periode"] }); setEditS(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const dT = useMutation({ mutationFn: (id: string) => delT({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["periode"] }), onError: (e: any) => toast.error(e.message) });
  const dS = useMutation({ mutationFn: (id: string) => delS({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["periode"] }), onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Periode</h1>
        <p className="text-sm text-muted-foreground">Kelola tahun ajaran & semester aktif.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="tahun">Tahun Ajaran</TabsTrigger>
          <TabsTrigger value="semester">Semester</TabsTrigger>
        </TabsList>

        <TabsContent value="tahun" className="space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daftar Tahun Ajaran</CardTitle>
              <Button size="sm" onClick={() => setEditT({})}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Aktif</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tahun.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>}
                  {tahun.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nama}</TableCell>
                      <TableCell>{t.tanggal_mulai ?? "—"}</TableCell>
                      <TableCell>{t.tanggal_selesai ?? "—"}</TableCell>
                      <TableCell>{t.is_active ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Aktif</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditT(t)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => dT.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="semester" className="space-y-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Daftar Semester</CardTitle>
              <Button size="sm" onClick={() => setEditS({})} disabled={tahun.length === 0}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tahun Ajaran</TableHead><TableHead>Nama</TableHead><TableHead>Mulai</TableHead><TableHead>Selesai</TableHead><TableHead>Aktif</TableHead><TableHead className="text-right">Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {semester.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>}
                  {semester.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.tahun_ajaran_id ? tahunMap.get(s.tahun_ajaran_id) : "—"}</TableCell>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell>{s.tanggal_mulai ?? "—"}</TableCell>
                      <TableCell>{s.tanggal_selesai ?? "—"}</TableCell>
                      <TableCell>{s.is_active ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Aktif</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => setEditS(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => dS.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editT} onOpenChange={(o) => !o && setEditT(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editT?.id ? "Edit" : "Tambah"} Tahun Ajaran</DialogTitle></DialogHeader>
          {editT && (
            <div className="grid gap-3">
              <div><Label>Nama *</Label><Input value={editT.nama ?? ""} onChange={(e) => setEditT({ ...editT, nama: e.target.value })} placeholder="2025/2026" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal Mulai</Label><Input type="date" value={editT.tanggal_mulai ?? ""} onChange={(e) => setEditT({ ...editT, tanggal_mulai: e.target.value })} /></div>
                <div><Label>Tanggal Selesai</Label><Input type="date" value={editT.tanggal_selesai ?? ""} onChange={(e) => setEditT({ ...editT, tanggal_selesai: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!editT.is_active} onCheckedChange={(v) => setEditT({ ...editT, is_active: v })} /><Label>Aktif</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditT(null)}>Batal</Button>
            <Button disabled={mT.isPending || !editT?.nama} onClick={() => mT.mutate({ id: editT?.id, nama: editT?.nama, tanggal_mulai: editT?.tanggal_mulai || null, tanggal_selesai: editT?.tanggal_selesai || null, is_active: !!editT?.is_active })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editS} onOpenChange={(o) => !o && setEditS(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editS?.id ? "Edit" : "Tambah"} Semester</DialogTitle></DialogHeader>
          {editS && (
            <div className="grid gap-3">
              <div>
                <Label>Tahun Ajaran *</Label>
                <Select value={editS.tahun_ajaran_id ?? ""} onValueChange={(v) => setEditS({ ...editS, tahun_ajaran_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                  <SelectContent>{tahun.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nama *</Label><Input value={editS.nama ?? ""} onChange={(e) => setEditS({ ...editS, nama: e.target.value })} placeholder="Ganjil / Genap" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tanggal Mulai</Label><Input type="date" value={editS.tanggal_mulai ?? ""} onChange={(e) => setEditS({ ...editS, tanggal_mulai: e.target.value })} /></div>
                <div><Label>Tanggal Selesai</Label><Input type="date" value={editS.tanggal_selesai ?? ""} onChange={(e) => setEditS({ ...editS, tanggal_selesai: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!editS.is_active} onCheckedChange={(v) => setEditS({ ...editS, is_active: v })} /><Label>Aktif</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditS(null)}>Batal</Button>
            <Button disabled={mS.isPending || !editS?.nama || !editS?.tahun_ajaran_id} onClick={() => mS.mutate({ id: editS?.id, tahun_ajaran_id: editS?.tahun_ajaran_id, nama: editS?.nama, tanggal_mulai: editS?.tanggal_mulai || null, tanggal_selesai: editS?.tanggal_selesai || null, is_active: !!editS?.is_active })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
