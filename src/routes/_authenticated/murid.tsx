import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Search, Users } from "lucide-react";
import { listAllStudents, saveStudent } from "@/lib/rombel-members.functions";
import { listRombel } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string | null;
  nis: string | null;
  nisn: string | null;
  gender: string | null;
  rombel_id: string | null;
  rombel_nama?: string | null;
  wali_kelas_name?: string | null;
};

export const Route = createFileRoute("/_authenticated/murid")({
  head: () => ({
    meta: [
      { title: "Manajemen Murid — SUPREME XPOES" },
      { name: "description", content: "Data seluruh murid yang terdaftar di semua rombel beserta identitasnya." },
      { property: "og:title", content: "Manajemen Murid — SUPREME XPOES" },
      { property: "og:description", content: "Kelola identitas murid: nama, NIS, NISN, jenis kelamin, dan rombel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAllStudents);
  const rombelFn = useServerFn(listRombel);
  const saveFn = useServerFn(saveStudent);

  const { data = [], isLoading } = useQuery({ queryKey: ["murid-all"], queryFn: () => fetchFn() as Promise<Row[]> });
  const { data: rombels = [] } = useQuery({ queryKey: ["rombel-list"], queryFn: () => rombelFn({ data: {} }) as Promise<any[]> });

  const [q, setQ] = useState("");
  const [rombelFilter, setRombelFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success("Data murid tersimpan");
      qc.invalidateQueries({ queryKey: ["murid-all"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (rombelFilter !== "all" && r.rombel_id !== rombelFilter) return false;
      if (genderFilter !== "all" && (r.gender ?? "") !== genderFilter) return false;
      if (!s) return true;
      return [r.name, r.nis, r.nisn, r.rombel_nama].some((v) => String(v ?? "").toLowerCase().includes(s));
    });
  }, [data, q, rombelFilter, genderFilter]);

  const totalL = rows.filter((r) => r.gender === "L").length;
  const totalP = rows.filter((r) => r.gender === "P").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Murid</h1>
        <p className="text-sm text-muted-foreground">Seluruh murid yang terdaftar di semua rombel beserta identitasnya.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Murid" value={rows.length} />
        <StatCard title="Laki-laki" value={totalL} />
        <StatCard title="Perempuan" value={totalP} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Daftar Murid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama / NIS / NISN / rombel…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={rombelFilter} onValueChange={setRombelFilter}>
              <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rombel</SelectItem>
                {rombels.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Semua JK" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua JK</SelectItem>
                <SelectItem value="L">Laki-laki</SelectItem>
                <SelectItem value="P">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Murid</TableHead>
                  <TableHead>JK</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>NISN</TableHead>
                  <TableHead>Rombel</TableHead>
                  <TableHead>Wali Kelas</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data murid.</TableCell></TableRow>
                ) : (
                  rows.slice(0, 1000).map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                      <TableCell>{r.gender ? <Badge variant="secondary">{r.gender}</Badge> : "—"}</TableCell>
                      <TableCell>{r.nis ?? "—"}</TableCell>
                      <TableCell>{r.nisn ?? "—"}</TableCell>
                      <TableCell>{r.rombel_nama ?? "—"}</TableCell>
                      <TableCell>{r.wali_kelas_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {rows.length > 1000 && (
            <p className="text-xs text-muted-foreground">Menampilkan 1000 dari {rows.length} murid. Gunakan pencarian/filter untuk mempersempit.</p>
          )}
        </CardContent>
      </Card>

      <EditDialog
        row={editing}
        rombels={rombels}
        onClose={() => setEditing(null)}
        onSave={(v) => save.mutate(v)}
        saving={save.isPending}
      />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function EditDialog({
  row, rombels, onClose, onSave, saving,
}: {
  row: Partial<Row> | null;
  rombels: any[];
  onClose: () => void;
  onSave: (v: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Row>>({});
  const key = row?.id ?? "none";

  useMemo(() => { setForm(row ?? {}); }, [key]);

  const submit = () => {
    if (!String(form.name ?? "").trim()) { toast.error("Nama murid wajib diisi"); return; }
    onSave({
      id: form.id,
      name: String(form.name).trim(),
      nis: form.nis || null,
      nisn: form.nisn || null,
      gender: form.gender || null,
      rombel_id: form.rombel_id || null,
    });
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader><DialogTitle>Edit Identitas Murid</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama Murid</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>NIS</Label>
              <Input value={form.nis ?? ""} onChange={(e) => setForm((f) => ({ ...f, nis: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>NISN</Label>
              <Input value={form.nisn ?? ""} onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select value={form.gender ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rombel</Label>
              <Select value={form.rombel_id ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, rombel_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {rombels.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
