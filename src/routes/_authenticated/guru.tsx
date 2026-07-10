import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CrudTable } from "@/components/crud-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { listGuru, saveGuru, deleteGuru, listMapel } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_kelamin: string | null;
  mata_pelajaran_id: string | null;
  mapel_nama?: string;
  kelompok_mapel: string | null;
  kualifikasi_pendidikan: string | null;
  no_whatsapp: string | null;
};

export const Route = createFileRoute("/_authenticated/guru")({
  head: () => ({ meta: [{ title: "Manajemen Guru — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listGuru);
  const fetchMapel = useServerFn(listMapel);
  const saveFn = useServerFn(saveGuru);
  const delFn = useServerFn(deleteGuru);
  const { data = [] } = useQuery({ queryKey: ["guru"], queryFn: () => fetchFn() as Promise<Row[]> });
  const { data: mapel = [] } = useQuery({ queryKey: ["mapel"], queryFn: () => fetchMapel() as Promise<any[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["guru"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["guru"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <CrudTable<Row>
        title="Manajemen Guru"
        description="Data guru & tenaga pendidik."
        rows={data}
        search={(r, q) => `${r.nama ?? ""} ${r.nip ?? ""} ${r.mapel_nama ?? ""}`.toLowerCase().includes(q)}
        columns={[
          { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
          { header: "NIP", cell: (r) => <span className="font-mono text-xs">{r.nip ?? "—"}</span> },
          { header: "JK", cell: (r) => r.jenis_kelamin ?? "—" },
          { header: "Mata Pelajaran", cell: (r) => r.mapel_nama ?? "—" },
          { header: "Kualifikasi", cell: (r) => r.kualifikasi_pendidikan ? <Badge variant="outline">{r.kualifikasi_pendidikan}</Badge> : "—" },
          { header: "WhatsApp", cell: (r) => r.no_whatsapp ?? "—" },
        ]}
        onAdd={() => setEditing({})}
        onEdit={(r) => setEditing(r)}
        onDelete={(r) => del.mutateAsync(r.id)}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Guru</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div><Label>Nama *</Label><Input value={editing.nama ?? ""} onChange={(e) => setEditing({ ...editing, nama: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>NIP</Label><Input value={editing.nip ?? ""} onChange={(e) => setEditing({ ...editing, nip: e.target.value })} /></div>
                <div>
                  <Label>Jenis Kelamin</Label>
                  <Select value={editing.jenis_kelamin ?? ""} onValueChange={(v) => setEditing({ ...editing, jenis_kelamin: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Mata Pelajaran</Label>
                <Select value={editing.mata_pelajaran_id ?? ""} onValueChange={(v) => setEditing({ ...editing, mata_pelajaran_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran" /></SelectTrigger>
                  <SelectContent>
                    {mapel.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Kelompok Mapel</Label><Input value={editing.kelompok_mapel ?? ""} onChange={(e) => setEditing({ ...editing, kelompok_mapel: e.target.value })} /></div>
                <div><Label>Kualifikasi</Label><Input value={editing.kualifikasi_pendidikan ?? ""} onChange={(e) => setEditing({ ...editing, kualifikasi_pendidikan: e.target.value })} placeholder="S1 / S2" /></div>
              </div>
              <div><Label>No. WhatsApp</Label><Input value={editing.no_whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, no_whatsapp: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({
              id: editing?.id,
              nama: editing?.nama,
              nip: editing?.nip || null,
              jenis_kelamin: editing?.jenis_kelamin || null,
              mata_pelajaran_id: editing?.mata_pelajaran_id || null,
              kelompok_mapel: editing?.kelompok_mapel || null,
              kualifikasi_pendidikan: editing?.kualifikasi_pendidikan || null,
              no_whatsapp: editing?.no_whatsapp || null,
            })}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
