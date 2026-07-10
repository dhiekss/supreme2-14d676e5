import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { listRevisions, createRevision, decideRevision } from "@/lib/revisi.functions";
import { listRombel, listStudentsByRombel } from "@/lib/presensi.functions";
import { Plus, Check, X } from "lucide-react";

const pendingQO = queryOptions({
  queryKey: ["revisi", "pending"],
  queryFn: () => listRevisions({ data: { status: "pending" } }),
});

export const Route = createFileRoute("/_authenticated/revisi-presensi")({
  head: () => ({ meta: [{ title: "Revisi Presensi — SUPREME XPOES" }] }),
  loader: async ({ context }) => {
    const [, rombel] = await Promise.all([
      context.queryClient.ensureQueryData(pendingQO),
      listRombel(),
    ]);
    return { rombel };
  },
  component: RevisiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function RevisiPage() {
  const { rombel } = Route.useLoaderData();
  const { data: pending } = useSuspenseQuery(pendingQO);
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [open, setOpen] = useState(false);

  const fetchHistory = useServerFn(listRevisions);
  const history = useQuery({
    queryKey: ["revisi", "history"],
    queryFn: () => fetchHistory({ data: { status: "all" } }),
    enabled: tab === "history",
  });

  const decide = useServerFn(decideRevision);
  const decideMut = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected"; rejectionReason?: string }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Permintaan diproses");
      qc.invalidateQueries({ queryKey: ["revisi"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revisi Presensi</h1>
          <p className="text-sm text-muted-foreground">Pengajuan & persetujuan koreksi kehadiran.</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          {open ? "Tutup" : "Ajukan Revisi"}
        </Button>
      </div>

      {open && <RevisionForm rombel={rombel} onClose={() => setOpen(false)} />}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Menunggu ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <RevisionTable
            rows={pending}
            actions={(r) => (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="default" onClick={() => decideMut.mutate({ id: r.id, decision: "approved" })}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  const reason = prompt("Alasan penolakan?") ?? "";
                  if (reason) decideMut.mutate({ id: r.id, decision: "rejected", rejectionReason: reason });
                }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {history.isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p>
            : <RevisionTable rows={history.data ?? []} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RevisionTable({ rows, actions }: { rows: any[]; actions?: (r: any) => React.ReactNode }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground py-8 text-center">Tidak ada data.</p>;
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Siswa</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead className="text-center">Asli → Diminta</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Status</TableHead>
              {actions && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap">{r.attendance_date}</TableCell>
                <TableCell>
                  <div className="font-medium">{r.student_name}</div>
                  <div className="text-xs text-muted-foreground">{r.student_nis}</div>
                </TableCell>
                <TableCell>{r.rombel_name}</TableCell>
                <TableCell className="text-center">
                  <span className="font-mono">{r.original_status ?? "—"} → <b>{r.requested_status}</b></span>
                </TableCell>
                <TableCell className="max-w-xs truncate" title={r.alasan}>{r.alasan}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                </TableCell>
                {actions && <TableCell className="text-right">{r.status === "pending" ? actions(r) : null}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RevisionForm({ rombel, onClose }: { rombel: any[]; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    rombelId: "",
    studentId: "",
    attendanceDate: today,
    requestedStatus: "H" as "H" | "S" | "I" | "A",
    alasan: "",
  });

  const fetchStudents = useServerFn(listStudentsByRombel);
  const students = useQuery({
    queryKey: ["students-by-rombel", form.rombelId],
    queryFn: () => fetchStudents({ data: { rombelId: form.rombelId } }),
    enabled: !!form.rombelId,
  });

  const create = useServerFn(createRevision);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("Permintaan revisi diajukan");
      qc.invalidateQueries({ queryKey: ["revisi"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rombelId || !form.studentId || !form.alasan) {
      return toast.error("Lengkapi semua field");
    }
    m.mutate();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ajukan Revisi</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Rombel</Label>
            <Select value={form.rombelId} onValueChange={(v) => setForm({ ...form, rombelId: v, studentId: "" })}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>{rombel.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Siswa</Label>
            <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })} disabled={!form.rombelId}>
              <SelectTrigger><SelectValue placeholder={form.rombelId ? "Pilih siswa" : "Pilih rombel dulu"} /></SelectTrigger>
              <SelectContent>
                {(students.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" value={form.attendanceDate} onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Status Baru</Label>
            <Select value={form.requestedStatus} onValueChange={(v: any) => setForm({ ...form, requestedStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="H">Hadir (H)</SelectItem>
                <SelectItem value="S">Sakit (S)</SelectItem>
                <SelectItem value="I">Izin (I)</SelectItem>
                <SelectItem value="A">Alfa (A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Alasan</Label>
            <Textarea value={form.alasan} onChange={(e) => setForm({ ...form, alasan: e.target.value })} rows={3} required />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={m.isPending}>{m.isPending ? "Mengajukan..." : "Ajukan"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
