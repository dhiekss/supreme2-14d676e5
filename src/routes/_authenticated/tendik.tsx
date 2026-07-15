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
import { listTendik, saveTendik, deleteTendik } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  nama: string | null;
  nip: string | null;
  jenis_kelamin: string | null;
  status_kepegawaian: string | null;
  golongan: string | null;
};

const STATUS_OPTIONS = ["PNS", "PPPK", "PTT", "PTY", "Honorer", "CPNS"];

export const Route = createFileRoute("/_authenticated/tendik")({
  head: () => ({ meta: [{ title: "Manajemen Tendik — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listTendik);
  const saveFn = useServerFn(saveTendik);
  const delFn = useServerFn(deleteTendik);
  const { data = [] } = useQuery({ queryKey: ["tendik"], queryFn: () => fetchFn() as Promise<Row[]> });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["tendik"] }); setEditing(null); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tendik"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <CrudTable<Row>
      title="Manajemen Tendik"
      description="Data tenaga kependidikan (non-guru)."
      rows={data}
      search={(r, q) => `${r.nama ?? ""} ${r.nip ?? ""} ${r.status_kepegawaian ?? ""} ${r.golongan ?? ""}`.toLowerCase().includes(q)}
      columns={[
        { header: "Nama", cell: (r) => <span className="font-medium">{r.nama}</span> },
        { header: "NIP", cell: (r) => <span className="font-mono text-xs">{r.nip ?? "—"}</span> },
        { header: "JK", cell: (r) => r.jenis_kelamin ?? "—" },
        { header: "Status", cell: (r) => r.status_kepegawaian ? <Badge variant="secondary">{r.status_kepegawaian}</Badge> : "—" },
        { header: "Golongan", cell: (r) => r.golongan ? <span className="font-mono text-xs">{r.golongan}</span> : "—" },
      ]}
      onAdd={() => setEditing({})}
      onEdit={(r) => setEditing(r)}
      onDelete={(r) => del.mutateAsync(r.id)}
      extra={
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Tendik</DialogTitle></DialogHeader>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status Kepegawaian</Label>
                    <Select value={editing.status_kepegawaian ?? ""} onValueChange={(v) => setEditing({ ...editing, status_kepegawaian: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Golongan</Label><Input value={editing.golongan ?? ""} onChange={(e) => setEditing({ ...editing, golongan: e.target.value })} placeholder="III/a, IV/b" /></div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
              <Button disabled={save.isPending || !editing?.nama} onClick={() => save.mutate({
                id: editing?.id,
                nama: editing?.nama,
                nip: editing?.nip || null,
                jenis_kelamin: editing?.jenis_kelamin || null,
                status_kepegawaian: editing?.status_kepegawaian || null,
                golongan: editing?.golongan || null,
              })}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
