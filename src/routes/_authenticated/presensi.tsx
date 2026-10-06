import { createFileRoute } from "@tanstack/react-router";
import { todayWIB } from "@/lib/wib";
import { queryOptions, useQuery, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import {
  listRombel,
  listStudentsByRombel,
  getAttendanceForDate,
  saveAttendance,
  getActiveSemester,
  getMyProfile,
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
import { toast } from "sonner";
import { Loader2, Calendar, User, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const rombelQO = queryOptions({ queryKey: ["rombel-list"], queryFn: () => listRombel() });
const semesterQO = queryOptions({ queryKey: ["semester-active"], queryFn: () => getActiveSemester() });
const meQO = queryOptions({ queryKey: ["me-profile"], queryFn: () => getMyProfile() });

export const Route = createFileRoute("/_authenticated/presensi")({
  head: () => ({ meta: [{ title: "Input Presensi Harian — SUPREME XPOES" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(rombelQO),
      context.queryClient.ensureQueryData(semesterQO),
      context.queryClient.ensureQueryData(meQO),
    ]),
  component: PresensiPage,
  errorComponent: ({ error }) => (
    <div className="text-destructive">Gagal memuat: {(error as Error).message}</div>
  ),
});

type Status = "H" | "S" | "I" | "A" | "P";

const STATUS_OPTIONS: { value: Status; label: string; dotClass: string; textClass: string }[] = [
  { value: "H", label: "Hadir", dotClass: "text-emerald-600 border-emerald-500", textClass: "text-emerald-700" },
  { value: "S", label: "Sakit", dotClass: "text-amber-600 border-amber-500", textClass: "text-amber-700" },
  { value: "I", label: "Izin", dotClass: "text-sky-600 border-sky-500", textClass: "text-sky-700" },
  { value: "A", label: "Alfa", dotClass: "text-rose-600 border-rose-500", textClass: "text-rose-700" },
  { value: "P", label: "PKL", dotClass: "text-violet-600 border-violet-500", textClass: "text-violet-700" },
];

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function formatDateID(d: Date) {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function PresensiPage() {
  const { data: rombelList } = useSuspenseQuery(rombelQO);
  const { data: me } = useSuspenseQuery(meQO);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveAttendance);
  const fetchStudents = useServerFn(listStudentsByRombel);
  const fetchAtt = useServerFn(getAttendanceForDate);

  const [rombelId, setRombelId] = useState<string>("");
  const [date, setDate] = useState<string>(() => todayWIB());
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const now = useClock();
  const officerName = me?.full_name || me?.email || "—";

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
    const map: Record<string, Status> = {};
    for (const s of studentsQuery.data) {
      const found = existing.find((d) => d.student_id === s.id);
      map[s.id] = (found?.status as Status) ?? "H";
    }
    setStatuses(map);
  }, [studentsQuery.data, attQuery.data]);

  const summary = useMemo(() => {
    const c: Record<Status, number> = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    Object.values(statuses).forEach((s) => (c[s] += 1));
    return c;
  }, [statuses]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          rombelId,
          date,
          officerName,
          entries: Object.entries(statuses).map(([studentId, status]) => ({ studentId, status })),
        },
      }),
    onSuccess: () => {
      toast.success("Presensi tersimpan");
      qc.invalidateQueries({ queryKey: ["attendance", rombelId, date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dateObj = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [date]);

  const clockStr = now.toLocaleTimeString("id-ID", { hour12: false, timeZone: "Asia/Jakarta" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Input Presensi Harian</h1>
        <p className="text-sm text-muted-foreground mt-1">{formatDateID(dateObj)}</p>
        <p className="text-sm font-medium text-primary mt-0.5">{clockStr} WIB</p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Form Presensi</CardTitle>
          <p className="text-xs text-muted-foreground">Isi data presensi harian murid</p>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5" /> Tanggal
            </Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-muted/40" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <User className="h-3.5 w-3.5" /> Nama Petugas Piket
            </Label>
            <Input value={officerName} disabled className="bg-muted/40 disabled:opacity-100 disabled:cursor-default" />
            <p className="text-[11px] text-muted-foreground">Diambil dari nama pengguna yang login</p>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <Users className="h-3.5 w-3.5" /> Nama Rombel
            </Label>
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger className="bg-muted/40 ring-1 ring-primary/40 focus:ring-primary">
                <SelectValue placeholder="Pilih Rombel" />
              </SelectTrigger>
              <SelectContent>
                {rombelList.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.tingkat ? `${r.tingkat} — ` : ""}{r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {rombelId && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <CardTitle className="text-lg shrink-0">Daftar Murid</CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                {STATUS_OPTIONS.map((o) => (
                  <span key={o.value} className={cn("flex items-center gap-1 font-medium", o.textClass)}>
                    <span className={cn("h-2 w-2 rounded-full bg-current")} />
                    {o.label}: {summary[o.value]}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat murid...
              </div>
            ) : (studentsQuery.data ?? []).length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">Belum ada murid pada rombel ini.</div>
            ) : (
              <div className="space-y-2">
                {(studentsQuery.data ?? []).map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-lg border border-border/50 px-3 py-2.5 transition-colors",
                      i % 2 === 0 ? "bg-muted/30" : "bg-background",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-background border text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate uppercase tracking-wide">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">NIS: {s.nis ?? "—"}</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end sm:mt-0 sm:ml-auto">
                      {STATUS_OPTIONS.map((o) => {
                        const active = statuses[s.id] === o.value;
                        return (
                          <button
                            type="button"
                            key={o.value}
                            onClick={() =>
                              setStatuses((p) => ({ ...p, [s.id]: o.value }))
                            }
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-medium transition",
                              active ? o.textClass : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-4 w-4 place-items-center rounded-full border-2 transition",
                                active ? o.dotClass : "border-muted-foreground/40",
                              )}
                            >
                              {active && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                            </span>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-start">
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !studentsQuery.data?.length}
                className="gap-2"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {mutation.isPending ? "Menyimpan..." : "Simpan Presensi"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
