import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, User, Users, GraduationCap, Calendar, BookOpen,
  CheckCircle2, Heart, FileText, XCircle, AlertTriangle, AlertCircle, Clock,
} from "lucide-react";
import { getSiswaDashboard } from "@/lib/dashboard-murid.functions";

export const Route = createFileRoute("/_authenticated/dashboard-murid/$studentId")({
  head: () => ({ meta: [{ title: "Dashboard Murid — SUPREME XPOES" }] }),
  component: Page,
});

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

function Page() {
  const { studentId } = Route.useParams();
  const now = new Date();
  const [mode, setMode] = useState<"bulan" | "semester">("bulan");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [semesterId, setSemesterId] = useState<string | undefined>(undefined);
  const fn = useServerFn(getSiswaDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-murid", studentId, mode, year, month, semesterId],
    queryFn: () => fn({ data: { studentId, mode, year, month, semesterId } }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  const { student, rombel, presensi, mapel, sp, teman, periode, semesterOptions, riwayatKelas } = data as any;
  const progressSp1 = Math.min(100, Math.round(((sp.alfaTotal / 3 + sp.terlambatTotal / 5) / 2) * 100));
  const layakSp1 = sp.alfaTotal > 3 || sp.terlambatTotal > 5;
  const spLabel = sp.currentLevel === 0 ? "Tidak Ada SP" : `SP${sp.currentLevel}`;
  const periodeLabel = periode.periodeLabel;
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Siswa</h1>
          <p className="text-sm text-muted-foreground mt-1">Melihat data: {student.name}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard-murid"><Users className="h-4 w-4 mr-2" /> Kembali ke Daftar</Link>
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Nama Siswa</div>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold mt-2">{student.name}</div>
            <div className="text-xs text-muted-foreground mt-1">NIS: {student.nis ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Rombel</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold mt-2">{rombel?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">{rombel?.konsentrasi_keahlian ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Wali Kelas</div>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xl font-bold mt-2">{rombel?.wali_kelas_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">Guru Wali Kelas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Kehadiran Bulan Ini</div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold mt-2 text-primary">{presensi.persenHadir}%</div>
            <Progress value={presensi.persenHadir} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filter periode */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" /> Filter Periode:
          </div>
          <Select value={mode} onValueChange={(v) => setMode(v as "bulan" | "semester")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bulan">Per Bulan</SelectItem>
              <SelectItem value="semester">Per Semester</SelectItem>
            </SelectContent>
          </Select>
          {mode === "bulan" ? (
            <>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>{BULAN[m - 1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Select value={periode.semesterId ?? ""} onValueChange={(v) => setSemesterId(v)}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
              <SelectContent>
                {(semesterOptions ?? []).map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nama}{s.is_active ? " (Aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Stat presensi */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Hadir" value={presensi.hadir} tone="green" />
        <StatCard icon={<Heart className="h-5 w-5" />} label="Sakit" value={presensi.sakit} tone="amber" />
        <StatCard icon={<FileText className="h-5 w-5" />} label="Izin" value={presensi.izin} tone="blue" />
        <StatCard icon={<XCircle className="h-5 w-5" />} label="Alfa" value={presensi.alfa} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mata pelajaran */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" /> Daftar Mata Pelajaran
            </CardTitle>
            <p className="text-xs text-muted-foreground">Mata pelajaran dan guru pengampu kelas Anda</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {mapel.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Belum ada data mata pelajaran.</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {mapel.map((m: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.mapel}</div>
                        <div className="text-xs text-muted-foreground">Kode: {m.kode}</div>
                      </div>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-sm font-medium truncate">{m.guru}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.nip}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Riwayat presensi */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" /> Riwayat Presensi {periodeLabel}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{periode.periodeStart} — {periode.periodeEnd}</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {presensi.riwayat.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Belum ada data presensi bulan ini
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                {presensi.riwayat.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded border text-sm">
                    <span>{new Date(r.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5" /> Status Surat Peringatan
          </CardTitle>
          <p className="text-xs text-muted-foreground">Riwayat dan akumulasi pelanggaran siswa</p>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          <div className={`flex items-center justify-between rounded-lg border p-4 ${sp.currentLevel === 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <div>
              <div className="text-xs text-muted-foreground">Status Saat Ini</div>
              <div className={`text-xl font-bold mt-1 ${sp.currentLevel === 0 ? "text-emerald-600" : "text-red-600"}`}>{spLabel}</div>
            </div>
            {sp.currentLevel === 0
              ? <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              : <AlertTriangle className="h-8 w-8 text-red-500" />}
          </div>

          <div>
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Akumulasi Total
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-4 bg-red-50/60">
                <div className="text-xs text-muted-foreground">Alfa</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{sp.alfaTotal}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Batas: &gt;3</div>
              </div>
              <div className="rounded-lg border p-4 bg-amber-50/60">
                <div className="text-xs text-muted-foreground">Terlambat</div>
                <div className="text-2xl font-bold text-amber-600 mt-1">{sp.terlambatTotal}</div>
                <div className="text-[11px] text-muted-foreground mt-1">Batas: &gt;5</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Progress ke SP1</span>
              <span>{progressSp1}%</span>
            </div>
            <Progress value={progressSp1} className="h-2" />
            {layakSp1 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertTriangle className="h-4 w-4" /> Sudah memenuhi syarat rekomendasi SP1
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Teman sekelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Teman Sekelas
          </CardTitle>
          <p className="text-xs text-muted-foreground">Daftar siswa lain di kelas {rombel?.name ?? "—"}</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {teman.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">Tidak ada teman sekelas.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-2">
              {teman.map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 p-2 rounded border">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.nis}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riwayat Kelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" /> Riwayat Kelas
          </CardTitle>
          <p className="text-xs text-muted-foreground">Perpindahan rombel dan kenaikan kelas murid.</p>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {(!riwayatKelas || riwayatKelas.length === 0) ? (
            <div className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat kelas.</div>
          ) : (
            <div className="relative pl-4 space-y-3 max-h-96 overflow-y-auto pr-2">
              {riwayatKelas.map((r: any) => {
                const toneMap: Record<string, string> = {
                  naik: "bg-emerald-100 text-emerald-700 border-emerald-200",
                  tinggal: "bg-amber-100 text-amber-700 border-amber-200",
                  lulus: "bg-blue-100 text-blue-700 border-blue-200",
                  keluar: "bg-red-100 text-red-700 border-red-200",
                  pindah: "bg-violet-100 text-violet-700 border-violet-200",
                };
                const tone = toneMap[r.status] ?? "bg-muted";
                return (
                  <div key={r.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${tone}`}>{r.jenis}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm truncate">
                        <span className="font-medium">{r.rombel_asal}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="font-medium">{r.rombel_tujuan}</span>
                      </div>
                      {r.catatan && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.catatan}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "green" | "amber" | "blue" | "red" }) {
  const toneMap = {
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
  } as const;
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-white/70 flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs mt-1 opacity-80">{label}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const key = String(status ?? "").toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    h: { label: "Hadir", cls: "bg-emerald-100 text-emerald-700" },
    hadir: { label: "Hadir", cls: "bg-emerald-100 text-emerald-700" },
    s: { label: "Sakit", cls: "bg-amber-100 text-amber-700" },
    sakit: { label: "Sakit", cls: "bg-amber-100 text-amber-700" },
    i: { label: "Izin", cls: "bg-blue-100 text-blue-700" },
    izin: { label: "Izin", cls: "bg-blue-100 text-blue-700" },
    a: { label: "Alfa", cls: "bg-red-100 text-red-700" },
    alfa: { label: "Alfa", cls: "bg-red-100 text-red-700" },
  };
  const m = map[key] ?? { label: status, cls: "bg-muted" };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}
