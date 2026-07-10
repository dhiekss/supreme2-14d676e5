import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Building2, CheckCircle2, Layers, Clock, AlertTriangle, Library, BookOpen } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";

const statsQO = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: () => getDashboardStats(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Halaman Utama — SUPREME XPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQO),
  component: Dashboard,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal memuat: {error.message}</div>,
});

const dateLong = new Date().toLocaleDateString("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

function Dashboard() {
  const { data } = useSuspenseQuery(statsQO);
  const persenStr = `${data.persenHadir}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Halaman Utama</h1>
        <p className="text-sm text-muted-foreground">{dateLong}</p>
      </div>

      {/* Top 4 stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <GradientStat title="Jumlah Guru" value={data.guru} subtitle={`Aktif Hari Ini: 0`} icon={Users} from="from-sky-500" to="to-blue-600" />
        <GradientStat title="Jumlah Murid" value={data.murid} subtitle={`Hadir Hari Ini: ${data.hadirHariIni}`} icon={GraduationCap} from="from-emerald-500" to="to-green-600" />
        <GradientStat title="Jumlah Rombel" value={data.rombel} subtitle="Kelas Aktif" icon={Building2} from="from-orange-500" to="to-amber-600" />
        <GradientStat title="Kehadiran Hari Ini" value={persenStr} valueSuffix="Murid" subtitle={`${data.hadirHariIni} dari ${data.totalPresensiHariIni} murid`} icon={CheckCircle2} from="from-violet-500" to="to-purple-600" />
      </div>

      {/* Tingkat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <TingkatCard label="Kelas X" data={data.tingkat.X} from="from-cyan-500" to="to-teal-600" />
        <TingkatCard label="Kelas XI" data={data.tingkat.XI} from="from-emerald-500" to="to-teal-700" />
        <TingkatCard label="Kelas XII" data={data.tingkat.XII} from="from-indigo-500" to="to-violet-700" />
      </div>

      {/* Secondary widgets */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={Clock} title="Keterlambatan" color="text-amber-600">
          <div className="text-3xl font-bold">{data.lateToday}</div>
          <div className="text-xs text-muted-foreground mt-1">Siswa terlambat hari ini</div>
        </InfoCard>
        <InfoCard icon={AlertTriangle} title="Manajemen BP / BK" color="text-rose-600">
          <div className="text-3xl font-bold">{data.spAktif}</div>
          <div className="text-xs text-muted-foreground mt-1">Kasus SP aktif</div>
        </InfoCard>
        <InfoCard icon={Library} title="Perpustakaan" color="text-indigo-600">
          <div className="text-3xl font-bold">{data.bukuDipinjam}</div>
          <div className="text-xs text-muted-foreground mt-1">Buku sedang dipinjam</div>
        </InfoCard>
        <InfoCard icon={Layers} title="Per Konsentrasi" color="text-emerald-600">
          <div className="space-y-1 mt-1 max-h-32 overflow-auto pr-1">
            {data.perKonsentrasi.slice(0, 6).map((k) => (
              <div key={k.nama} className="flex justify-between text-xs">
                <span className="truncate pr-2">{k.nama || "Lainnya"}</span>
                <span className="font-semibold">{k.total}</span>
              </div>
            ))}
          </div>
        </InfoCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Selamat datang di SUPREME XPOES</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Gunakan menu di sisi kiri untuk mengakses seluruh modul manajemen sekolah.
        </CardContent>
      </Card>
    </div>
  );
}

function GradientStat({
  title, value, subtitle, icon: Icon, from, to, valueSuffix,
}: { title: string; value: number | string; subtitle?: string; icon: any; from: string; to: string; valueSuffix?: string }) {
  return (
    <Card className={`bg-gradient-to-br ${from} ${to} text-white border-0 shadow-md`}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
        <Icon className="h-5 w-5 text-white/80" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold tracking-tight">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</div>
          {valueSuffix && <div className="text-sm text-white/90">{valueSuffix}</div>}
        </div>
        {subtitle && <div className="text-xs text-white/80 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function TingkatCard({ label, data, from, to }: { label: string; data: { total: number; L: number; P: number }; from: string; to: string }) {
  return (
    <Card className={`bg-gradient-to-br ${from} ${to} text-white border-0 shadow-md`}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <CardTitle className="text-sm font-medium text-white/90">{label}</CardTitle>
        <Layers className="h-5 w-5 text-white/80" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-4xl font-bold tracking-tight">{data.total.toLocaleString("id-ID")}</div>
        <div className="text-xs text-white/90 mt-2 flex gap-4">
          <span>L: <strong>{data.L}</strong></span>
          <span>P: <strong>{data.P}</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
