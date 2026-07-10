import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRombel } from "@/lib/presensi.functions";
import {
  listKeterlambatan,
  createKeterlambatan,
  deleteKeterlambatan,
  listStudentsByRombel,
} from "@/lib/keterlambatan.functions";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/keterlambatan")({
  head: () => ({ meta: [{ title: "Keterlambatan — SUPREME XPOES" }] }),
  loader: async () => ({ rombel: await listRombel() }),
  component: KeterlambatanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function KeterlambatanPage() {
  const { rombel } = Route.useLoaderData();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [filterRombel, setFilterRombel] = useState<string>("all");

  const qc = useQueryClient();
  const fetchList = useServerFn(listKeterlambatan);
  const removeFn = useServerFn(deleteKeterlambatan);

  const { data, isFetching } = useSuspenseQuery({
    queryKey: ["keterlambatan", from, to, filterRombel],
    queryFn: () =>
      fetchList({
        data: {
          from,
          to,
          rombelId: filterRombel === "all" ? undefined : filterRombel,
        },
      }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Catatan dihapus");
      qc.invalidateQueries({ queryKey: ["keterlambatan"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keterlambatan</h1>
          <p className="text-sm text-muted-foreground">Catat & pantau siswa yang datang terlambat.</p>
        </div>
        <LateForm rombel={rombel} onCreated={() => qc.invalidateQueries({ queryKey: ["keterlambatan"] })} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={filterRombel} onValueChange={setFilterRombel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua rombel</SelectItem>
                  {rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar — {data.length} catatan {isFetching && "(memuat…)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada catatan</TableCell></TableRow>
              ) : (
                data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.record_date}</TableCell>
                    <TableCell>{r.student_nis}</TableCell>
                    <TableCell>{r.student_name}</TableCell>
                    <TableCell>{r.rombel_name}</TableCell>
                    <TableCell>{r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus catatan ini?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LateForm({ rombel, onCreated }: { rombel: any[]; onCreated: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [rombelId, setRombelId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [recordDate, setRecordDate] = useState(today);

  const fetchStudents = useServerFn(listStudentsByRombel);
  const createFn = useServerFn(createKeterlambatan);

  const { data: students = [] } = useQuery({
    queryKey: ["students-by-rombel", rombelId],
    queryFn: () => fetchStudents({ data: { rombelId } }),
    enabled: !!rombelId,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { studentId, rombelId, recordDate } }),
    onSuccess: () => {
      toast.success("Keterlambatan dicatat");
      setStudentId("");
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="w-full md:w-auto md:min-w-[420px]">
      <CardHeader className="pb-3"><CardTitle className="text-base">Catat Keterlambatan</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Rombel</Label>
            <Select value={rombelId} onValueChange={(v) => { setRombelId(v); setStudentId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Tanggal</Label>
            <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Siswa</Label>
          <Select value={studentId} onValueChange={setStudentId} disabled={!rombelId}>
            <SelectTrigger><SelectValue placeholder={rombelId ? "Pilih siswa" : "Pilih rombel dulu"} /></SelectTrigger>
            <SelectContent>
              {students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} {s.nis ? `(${s.nis})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={() => create.mutate()} disabled={!studentId || !rombelId || create.isPending}>
          <Plus className="h-4 w-4 mr-1" />
          {create.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </CardContent>
    </Card>
  );
}
