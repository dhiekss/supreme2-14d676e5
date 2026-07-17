import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getGuruDashboard } from "@/lib/dashboard-guru.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, User, CalendarDays, BookOpen, Users, FileCheck, QrCode,
  Clock, AlertCircle, AlertTriangle, FileText, Search, ExternalLink,
} from "lucide-react";
import { QrDialog } from "@/components/qr-dialog";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard-guru/$guruId")({
  head: () => ({ meta: [{ title: "Dashboard Guru — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const { guruId } = Route.useParams();
  const fn = useServerFn(getGuruDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-guru", guruId],
    queryFn: () => fn({ data: { guruId } }),
  });
  const [qrOpen, setQrOpen] = useState(false);

  if (isLoading) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  if (error) return <div className="text-sm text-destructive">{(error as Error).message}</div>;
  if (!data) return null;

  const { guru, waliKelas, today, stats, jadwalHariIni, kelasDiampu, alfaList, terlambatList, rekomendasiSp } = data;
  const tanggalId = new Date(today.tanggal).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard-guru"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Guru</h1>
          <p className="text-sm text-muted-foreground">{tanggalId}</p>
        </div>
      </div>

      {/* Profil */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Profil Guru
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Field label="Nama Lengkap" value={guru.nama} />
          <Field label="NIP" value={guru.nip} mono />
          <Field label="Mata Pelajaran" value={guru.mapel_nama} />
          <Field label="Kelompok Mapel">{guru.kelompok_mapel ? <Badge variant="outline">{guru.kelompok_mapel}</Badge> : "—"}</Field>
          <Field label="Kualifikasi" value={guru.kualifikasi_pendidikan} />
          <Field label="No. WhatsApp" value={guru.no_whatsapp} />
          {waliKelas.length > 0 && (
            <Field label="Status Wali Kelas">
              <div className="flex flex-wrap gap-1">
                {waliKelas.map((n) => (
                  <Badge key={n} className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <Users className="h-3 w-3 mr-1" /> Wali Kelas {n}
                  </Badge>
                ))}
              </div>
            </Field>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<CalendarDays className="h-4 w-4" />} label="Jadwal Hari Ini" value={String(today.jamHariIni)} sub="jam pelajaran" />
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Realisasi KBM" value={`${stats.persenKBM}%`} sub={`${stats.jamRealisasi}/${stats.jamTerjadwal} jam bulan ini`} progress={stats.persenKBM} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Kelas Diampu" value={String(stats.kelasDiampu)} sub="rombongan belajar" />
        <StatCard icon={<FileCheck className="h-4 w-4" />} label="Administrasi" value={`${stats.berkasValid}/${stats.berkasTotal}`} sub="berkas valid" link="/berkas" />
      </div>

      {/* QR Code */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-4 w-4" /> QR Code untuk Kelas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Tampilkan QR Code dinamis untuk validasi kehadiran di kelas. QR Code berubah setiap 15 detik untuk keamanan.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" /> Tampilkan QR Code
          </Button>
        </CardContent>
      </Card>

      {/* Jadwal hari ini */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Jadwal Mengajar Hari Ini ({today.hari})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jadwalHariIni.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada jadwal hari ini.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-normal">Jam Ke</th>
                    <th className="px-4 py-2 font-normal">Waktu</th>
                    <th className="px-4 py-2 font-normal">Rombel</th>
                    <th className="px-4 py-2 font-normal">Mata Pelajaran</th>
                    <th className="px-4 py-2 font-normal">Status KBM</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwalHariIni.map((j) => (
                    <tr key={j.id} className="border-t">
                      <td className="px-4 py-2 text-primary font-medium">{j.jam_ke}</td>
                      <td className="px-4 py-2">{j.jam_mulai} - {j.jam_selesai}</td>
                      <td className="px-4 py-2">{j.rombel_name}</td>
                      <td className="px-4 py-2">{j.mapel_nama}</td>
                      <td className="px-4 py-2">
                        {j.sudah_input ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Sudah Input</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Clock className="h-3 w-3 mr-1" /> Belum Input
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alfa / Terlambat / Rekomendasi SP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StudentListCard
          icon={<AlertCircle className="h-4 w-4 text-rose-500" />}
          title="Siswa Alfa"
          subtitle="Semester aktif"
          badge={String(alfaList.reduce((s, a) => s + a.count, 0))}
          items={alfaList.slice(0, 5).map((a) => ({ name: a.name, sub: a.rombel, right: `${a.count}x` }))}
          empty="Tidak ada siswa alfa"
        />
        <StudentListCard
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          title="Siswa Terlambat"
          subtitle="Semester aktif"
          badge={String(terlambatList.reduce((s, a) => s + a.count, 0))}
          items={terlambatList.slice(0, 5).map((a) => ({ name: a.name, sub: a.rombel, right: `${a.count}x` }))}
          empty="Tidak ada siswa terlambat"
        />
        <StudentListCard
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          title="Rekomendasi SP"
          subtitle="Alfa > 3 atau Terlambat > 5"
          badge={String(rekomendasiSp.length)}
          items={rekomendasiSp.slice(0, 5).map((a) => ({ name: a.name, sub: a.rombel, right: `A:${a.alfa} T:${a.terlambat}` }))}
          empty="Tidak ada rekomendasi SP"
        />
      </div>

      {/* SP recap */}
      <SpRecap studentIds={rekomendasiSp.map((r) => r.student_id)} rekomendasi={rekomendasiSp} />

      {/* Kelas diampu */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Kelas yang Diampu</CardTitle>
        </CardHeader>
        <CardContent>
          {kelasDiampu.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Belum ada kelas.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {kelasDiampu.map((k) => (
                <div key={k.id} className="border rounded-lg p-3 flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{k.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{k.mapel}</div>
                    {k.konsentrasi && <div className="text-xs text-muted-foreground/70">{k.konsentrasi}</div>}
                  </div>
                  <Badge variant="outline" className="shrink-0">{k.siswa} siswa</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QrDialog open={qrOpen} onOpenChange={setQrOpen} title={`QR Code — ${guru.nama}`} value={guru.id} />
    </div>
  );
}

function Field({ label, value, children, mono }: { label: string; value?: string | null; children?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm"}>
        {children ?? (value || "—")}
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, progress, link,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; progress?: number; link?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
        <div className="text-2xl font-bold">{value}</div>
        {typeof progress === "number" && <Progress value={progress} className="h-1" />}
        {sub && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span>{sub}</span>
            {link && (
              <Link to={link} className="ml-auto text-primary inline-flex items-center gap-1">
                Lihat Detail <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudentListCard({
  icon, title, subtitle, badge, items, empty,
}: {
  icon: React.ReactNode; title: string; subtitle: string; badge: string;
  items: { name: string; sub: string; right: string }[]; empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">{icon} {title}</CardTitle>
          <Badge className="bg-rose-500 hover:bg-rose-500 text-white">{badge}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">{empty}</div>
        ) : (
          items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground truncate">{it.sub}</div>
              </div>
              <Badge className="bg-rose-500 hover:bg-rose-500 text-white shrink-0">{it.right}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SpRecap({ studentIds, rekomendasi }: {
  studentIds: string[];
  rekomendasi: { student_id: string; name: string; rombel: string; alfa: number; terlambat: number }[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rekomendasi;
    return rekomendasi.filter((r) => `${r.name} ${r.rombel}`.toLowerCase().includes(s));
  }, [q, rekomendasi]);
  if (!studentIds.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Data Surat Peringatan (SP)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Data murid berdasarkan rekomendasi</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-normal w-10">No</th>
                <th className="px-3 py-2 font-normal">Nama</th>
                <th className="px-3 py-2 font-normal">Rombel</th>
                <th className="px-3 py-2 font-normal">Jml Alfa</th>
                <th className="px-3 py-2 font-normal">Jml Terlambat</th>
                <th className="px-3 py-2 font-normal text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.student_id} className="border-t">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.rombel}</td>
                  <td className="px-3 py-2">
                    <Badge className={r.alfa > 3 ? "bg-rose-500 text-white hover:bg-rose-500" : "bg-muted text-foreground hover:bg-muted"}>{r.alfa}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={r.terlambat > 5 ? "bg-rose-500 text-white hover:bg-rose-500" : "bg-muted text-foreground hover:bg-muted"}>{r.terlambat}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/sp"><FileText className="h-3 w-3 mr-1" /> Surat</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-4 text-xs">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
