import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMapel, saveMapel, deleteMapel } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = { id: string; nama: string | null; kode: string | null; kelompok: string | null };

export const Route = createFileRoute("/_authenticated/mapel")({
  head: () => ({ meta: [{ title: "Mata Pelajaran — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listMapel);
  const saveFn = useServerFn(saveMapel);
  const delFn = useServerFn(deleteMapel);
  const { data = [] } = useQuery({ queryKey: ["mapel"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["mapel"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["mapel"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <CrudTable<Row>
        title="Manajemen Mata Pelajaran"
        description="Daftar mata pelajaran."
        rows={data}
        search={(r, q) => `${r.nama ?? ""} ${r.kode ?? ""} ${r.kelompok ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Kode", cell: (r) => <span className="font-mono text-xs">{r.kode ?? "—"}</span> },
          { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
          { header: "Kelompok", cell: (r) => r.kelompok ? <Badge variant="outline">{r.kelompok}</Badge> : "—" },
        ]}
        onAdd={() => setEditing({})}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Mata Pelajaran</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Kode</Label><Input value={editing.kode ?? ""} onChange={(e) => setEditing({ ...editing, kode: e.target.value })} /></div>
                <div className="col-span-2"><Label>Nama *</Label><Input value={editing.nama ?? ""} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} /></div>
              </div>
              <div><Label>Kelompok</Label><Input value={editing.kelompok ?? ""} onChange={(e) => setEditing({ ...editing, kelompok: e.target.value })} placeholder="A / B / C1 / C2 / C3" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({ id: editing?.id, nama: editing?.nama, kode: editing?.kode || null, kelompok: editing?.kelompok || null })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
