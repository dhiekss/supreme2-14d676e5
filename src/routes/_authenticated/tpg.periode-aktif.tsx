import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPeriodeAktif, addPeriodeAktif, setPeriodeAktifStatus, deletePeriodeAktif } from "@/lib/tpg.functions";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { BULAN_FULL } from "@/components/tpg/shared";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tpg/periode-aktif")({
  ssr: false,
  head: () => ({ meta: [{ title: "Periode Aktif TPG — SUPREME XPOES" }] }),
  component: PeriodeAktifPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function PeriodeAktifPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listPeriodeAktif);
  const addFn = useServerFn(addPeriodeAktif);
  const toggleFn = useServerFn(setPeriodeAktifStatus);
  const deleteFn = useServerFn(deletePeriodeAktif);

  const { data } = useSuspenseQuery({
    queryKey: ["tpg-periode"], queryFn: () => fetchFn(),
  });
  const rows: any[] = data.rows;
  const isAdmin: boolean = data.is_admin;

  const [open, setOpen] = useState(false);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState(String(new Date().getFullYear()));
  const [toDelete, setToDelete] = useState<any | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tpg-periode"] });

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { bulan: Number(bulan), tahun: Number(tahun) } }),
    onSuccess: () => {
      toast.success("Periode berhasil ditambahkan.");
      setOpen(false);
      setBulan("");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menambahkan periode."),
  });

  const toggleMut = useMutation({
    mutationFn: (r: any) => toggleFn({ data: { id: r.id, is_active: !r.is_active } }),
    onSuccess: (_v, r) => {
      toast.success(r.is_active ? "Periode dinonaktifkan." : "Periode diaktifkan.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal mengubah status."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Periode dihapus.");
      setToDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menghapus periode."),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Periode Pelaporan TPG</h1>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Periode
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground py-8">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{BULAN_FULL[r.bulan - 1]} {r.tahun}</TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          disabled={toggleMut.isPending}
                          onClick={() => toggleMut.mutate(r)}
                        >
                          {r.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Periode Pelaporan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select value={bulan} onValueChange={setBulan}>
                <SelectTrigger><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
                <SelectContent>
                  {BULAN_FULL.map((b, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              disabled={!bulan || !tahun || addMut.isPending}
              onClick={() => addMut.mutate()}
            >
              {addMut.isPending ? "Menyimpan..." : "Tambah Periode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Periode?</AlertDialogTitle>
            <AlertDialogDescription>
              Periode {toDelete ? `${BULAN_FULL[toDelete.bulan - 1]} ${toDelete.tahun}` : ""} akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
