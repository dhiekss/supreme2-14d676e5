import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  listRombel,
  listStudentsByRombel,
  getAttendanceForDate,
  saveAttendance,
  getActiveSemester,
} from "@/lib/presensi.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const rombelQO = queryOptions({
  queryKey: ["rombel-list"],
  queryFn: () => listRombel(),
});

const semesterQO = queryOptions({
  queryKey: ["semester-active"],
  queryFn: () => getActiveSemester(),
});

export const Route = createFileRoute("/_authenticated/presensi")({
  head: () => ({ meta: [{ title: "Presensi — SUPREME XPOES" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(rombelQO),
      context.queryClient.ensureQueryData(semesterQO),
    ]),
  component: PresensiPage,
  errorComponent: ({ error }) => (
    <div className="text-destructive">Gagal memuat: {error.message}</div>
  ),
});

const STATUS_OPTIONS = [
  { value: "H", label: "Hadir" },
  { value: "S", label: "Sakit" },
  { value: "I", label: "Izin" },
  { value: "A", label: "Alfa" },
] as const;

function PresensiPage() {
  const { data: rombelList } = useSuspenseQuery(rombelQO);
  const { data: semester } = useSuspenseQuery(semesterQO);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveAttendance);
  const fetchStudents = useServerFn(listStudentsByRombel);
  const fetchAtt = useServerFn(getAttendanceForDate);

  const [rombelId, setRombelId] = useState<string>("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [officerName, setOfficerName] = useState("");
  const [statuses, setStatuses] = useState<Record<string, "H" | "S" | "I" | "A">>({});

  const studentsQuery = useQuery({
    queryKey: ["students-by-rombel", rombelId],
    queryFn: () => fetchStudents({ data: { rombelId } }),
    enabled: !!rombelId,
  });

  const attQuery = useQuery({
    queryKey: ["attendance", rombelId, date],
    queryFn: () => fetchAtt({ data: { rombelId, date } }),
    enabled: !!rombelId && !!date,
  });

  useEffect(() => {
    if (!studentsQuery.data) return;
    const existing = attQuery.data?.details ?? [];
    const map: Record<string, "H" | "S" | "I" | "A"> = {};
    for (const s of studentsQuery.data) {
      const found = existing.find((d) => d.student_id === s.id);
      map[s.id] = (found?.status as "H" | "S" | "I" | "A") ?? "H";
    }
    setStatuses(map);
    if (attQuery.data?.record?.officer_name) {
      setOfficerName(attQuery.data.record.officer_name);
    }
  }, [studentsQuery.data, attQuery.data]);

  const summary = useMemo(() => {
    const c = { H: 0, S: 0, I: 0, A: 0 };
    Object.values(statuses).forEach((s) => (c[s] += 1));
    return c;
  }, [statuses]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          rombelId,
          date,
          officerName: officerName || "—",
          entries: Object.entries(statuses).map(([studentId, status]) => ({ studentId, status })),
        },
      }),
    onSuccess: () => {
      toast.success("Presensi tersimpan");
      qc.invalidateQueries({ queryKey: ["attendance", rombelId, date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAll = (val: "H" | "S" | "I" | "A") => {
    if (!studentsQuery.data) return;
    const map: Record<string, "H" | "S" | "I" | "A"> = {};
    for (const s of studentsQuery.data) map[s.id] = val;
    setStatuses(map);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presensi Harian</h1>
          <p className="text-sm text-muted-foreground">
            Semester aktif: <span className="font-medium">{semester?.nama ?? "—"}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih Kelas & Tanggal</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Rombel</Label>
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
              <SelectContent>
                {rombelList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.tingkat} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Petugas</Label>
            <Input value={officerName} onChange={(e) => setOfficerName(e.target.value)} placeholder="Nama petugas" />
          </div>
        </CardContent>
      </Card>

      {rombelId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Daftar Siswa</CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">H {summary.H}</span>
              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 font-medium">S {summary.S}</span>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 font-medium">I {summary.I}</span>
              <span className="px-2 py-1 rounded bg-destructive/10 text-destructive font-medium">A {summary.A}</span>
              <div className="ml-2 flex gap-1">
                {STATUS_OPTIONS.map((o) => (
                  <Button key={o.value} variant="outline" size="sm" onClick={() => setAll(o.value)}>
                    Semua {o.value}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat siswa...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-32">NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-16 text-center">L/P</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(studentsQuery.data ?? []).map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{s.nis}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-center">{s.gender}</TableCell>
                      <TableCell>
                        <Select
                          value={statuses[s.id] ?? "H"}
                          onValueChange={(v) =>
                            setStatuses((p) => ({ ...p, [s.id]: v as "H" | "S" | "I" | "A" }))
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(studentsQuery.data ?? []).length === 0 && !studentsQuery.isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Belum ada siswa pada rombel ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !studentsQuery.data?.length}
              >
                {mutation.isPending ? "Menyimpan..." : "Simpan Presensi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
