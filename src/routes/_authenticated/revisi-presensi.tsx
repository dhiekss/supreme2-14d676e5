import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listRevisions, createRevision, decideRevision } from "@/lib/revisi.functions";
import { listRombel, listStudentsByRombel, getAttendanceForDate } from "@/lib/presensi.functions";
import { Check, X, RefreshCcw, Search, Pencil, Calendar as CalendarIcon } from "lucide-react";

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
  errorComponent: ({ error }) => <div className="text-destructive p-4">Gagal: {error.message}</div>,
});

const STATUS_LABEL: Record<string, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", P: "PKL" };
const STATUS_TONE: Record<string, string> = {
  H: "bg-emerald-100 text-emerald-700 border-emerald-200",
  S: "bg-amber-100 text-amber-700 border-amber-200",
  I: "bg-sky-100 text-sky-700 border-sky-200",
  A: "bg-rose-100 text-rose-700 border-rose-200",
  P: "bg-violet-100 text-violet-700 border-violet-200",
};

function formatDateID(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch { return d; }
}

function RevisiPage() {
  const { rombel } = Route.useLoaderData();
  const { data: pending } = useSuspenseQuery(pendingQO);
  const qc = useQueryClient();
  const [tab, setTab] = useState("data");

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revisi Presensi</h1>
        <p className="text-sm text-muted-foreground">Kelola pengajuan revisi presensi dari wali kelas.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="data">Data Presensi</TabsTrigger>
          <TabsTrigger value="pending">Menunggu Persetujuan ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4">
          <DataPresensiTab rombel={rombel} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <RevisionTable
            rows={pending}
            actions={(r) => (
              <div className="flex gap-2 justify-end">
                <Button size="sm" onClick={() => decideMut.mutate({ id: r.id, decision: "approved" })}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                </Button>
                <Button size="sm" variant="destructive" onClick={() => {
                  const reason = prompt("Alasan penolakan?") ?? "";
                  if (reason) decideMut.mutate({ id: r.id, decision: "rejected", rejectionReason: reason });
                }}>
                  <X className="h-3.5 w-3.5 mr-1" /> Tolak
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

function DataPresensiTab({ rombel }: { rombel: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [rombelId, setRombelId] = useState<string>(rombel[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{ studentId: string; name: string; nis: string; current?: string } | null>(null);

  const fetchStudents = useServerFn(listStudentsByRombel);
  const fetchAtt = useServerFn(getAttendanceForDate);

  const students = useQuery({
    queryKey: ["students-by-rombel", rombelId],
    queryFn: () => fetchStudents({ data: { rombelId } }),
    enabled: !!rombelId,
  });

  const attendance = useQuery({
    queryKey: ["attendance-for-date", rombelId, date],
    queryFn: () => fetchAtt({ data: { rombelId, date } }),
    enabled: !!rombelId && !!date,
  });

  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["students-by-rombel", rombelId] });
    qc.invalidateQueries({ queryKey: ["attendance-for-date", rombelId, date] });
  };

  const statusByStudent = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of attendance.data?.details ?? []) if (d.student_id) m.set(d.student_id, d.status as string);
    return m;
  }, [attendance.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students.data ?? [])
      .map((s: any) => ({ ...s, status: statusByStudent.get(s.id) ?? null }))
      .filter((s: any) => !q || s.name?.toLowerCase().includes(q) || String(s.nis ?? "").toLowerCase().includes(q));
  }, [students.data, statusByStudent, search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter Data Presensi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={rombelId} onValueChange={setRombelId}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {rombel.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <div className="relative">
                <CalendarIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cari Murid</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input placeholder="Nama atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
              <RefreshCcw className="h-3.5 w-3.5" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Presensi — {formatDateID(date)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">No</TableHead>
                  <TableHead className="w-32">NIS</TableHead>
                  <TableHead>Nama Murid</TableHead>
                  <TableHead className="w-40">Status</TableHead>
                  <TableHead className="w-40 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s: any, i: number) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{s.nis ?? "-"}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                    <TableCell>
                      {s.status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_TONE[s.status] ?? ""}`}>
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Belum diinput</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => setTarget({ studentId: s.id, name: s.name, nis: s.nis, current: s.status ?? undefined })}>
                        <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Ajukan </span>Revisi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {students.isLoading ? "Memuat..." : "Tidak ada murid."}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

      </Card>

      <RevisionDialog
        open={!!target}
        onOpenChange={(v) => !v && setTarget(null)}
        target={target}
        rombelId={rombelId}
        date={date}
        onSuccess={() => { setTarget(null); refresh(); }}
      />
    </div>
  );
}

function RevisionDialog({
  open, onOpenChange, target, rombelId, date, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  target: { studentId: string; name: string; nis: string; current?: string } | null;
  rombelId: string; date: string; onSuccess: () => void;
}) {
  const [requestedStatus, setRequestedStatus] = useState<"H" | "S" | "I" | "A">("H");
  const [alasan, setAlasan] = useState("");
  const create = useServerFn(createRevision);
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: () => create({
      data: {
        rombelId,
        studentId: target!.studentId,
        attendanceDate: date,
        requestedStatus,
        alasan,
      },
    }),
    onSuccess: () => {
      toast.success("Permintaan revisi diajukan");
      qc.invalidateQueries({ queryKey: ["revisi"] });
      setAlasan(""); setRequestedStatus("H");
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajukan Revisi Presensi</DialogTitle>
        </DialogHeader>
        {target && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div><span className="text-muted-foreground">Murid:</span> <b>{target.name}</b> ({target.nis})</div>
              <div><span className="text-muted-foreground">Tanggal:</span> {formatDateID(date)}</div>
              <div><span className="text-muted-foreground">Status saat ini:</span>{" "}
                {target.current ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_TONE[target.current] ?? ""}`}>
                    {STATUS_LABEL[target.current] ?? target.current}
                  </span>
                ) : <em className="text-muted-foreground">Belum diinput</em>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status Baru</Label>
              <Select value={requestedStatus} onValueChange={(v: any) => setRequestedStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="H">Hadir (H)</SelectItem>
                  <SelectItem value="S">Sakit (S)</SelectItem>
                  <SelectItem value="I">Izin (I)</SelectItem>
                  <SelectItem value="A">Alfa (A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alasan</Label>
              <Textarea rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Jelaskan alasan revisi..." />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={() => {
            if (alasan.trim().length < 3) return toast.error("Alasan minimal 3 karakter");
            m.mutate();
          }} disabled={m.isPending}>{m.isPending ? "Mengajukan..." : "Ajukan Revisi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
              <TableHead>Murid</TableHead>
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
