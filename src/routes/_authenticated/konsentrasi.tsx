import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { listKonsentrasi, saveKonsentrasi, deleteKonsentrasi } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = { id: string; name: string | null; description: string | null };

export const Route = createFileRoute("/_authenticated/konsentrasi")({
  head: () => ({ meta: [{ title: "Konsentrasi Keahlian — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listKonsentrasi);
  const saveFn = useServerFn(saveKonsentrasi);
  const delFn = useServerFn(deleteKonsentrasi);
  const { data = [] } = useQuery({ queryKey: ["konsentrasi"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["konsentrasi"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["konsentrasi"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <CrudTable<Row>
        title="Konsentrasi Keahlian"
        description="Daftar konsentrasi keahlian sekolah."
        rows={data}
        search={(r, q) => `${r.name ?? ""} ${r.description ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Nama", cell: (r) => <span className="font-medium">{r.name}</span> },
          { header: "Deskripsi", cell: (r) => r.description ?? "—" },
        ]}
        onAdd={() => setEditing({})}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Konsentrasi</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Nama *</Label><Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Deskripsi</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.name} onClick={() => save.mutate({ id: editing?.id, name: editing?.name, description: editing?.description || null })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
