import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp, Users, Briefcase, BookOpen, Sparkles } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type Row = {
  nama: string | null;
  jenis_kelamin: string | null;
  mapel_nama?: string;
  kualifikasi_pendidikan: string | null;
  status_kepegawaian: string | null;
  konsentrasi_nama?: string | null;
};

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(217 91% 60%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(340 82% 52%)",
  "hsl(262 83% 58%)",
  "hsl(190 90% 45%)",
  "hsl(24 95% 53%)",
  "hsl(142 71% 45%)",
  "hsl(280 70% 55%)",
  "hsl(48 96% 53%)",
  "hsl(200 80% 50%)",
];

function groupBy(rows: Row[], key: (r: Row) => string | null | undefined, emptyLabel = "Tidak Diisi") {
  const map = new Map<string, number>();
  for (const r of rows) {
    const raw = key(r);
    const k = raw && String(raw).trim() ? String(raw).trim() : emptyLabel;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function ChartTooltip({ active, payload, total }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const value = p.value as number;
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-md text-sm">
      <div className="font-medium">{p.payload.label}</div>
      <div className="text-muted-foreground text-xs mt-0.5">
        {value} guru · {pct}%
      </div>
    </div>
  );
}

function Legend2({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  return (
    <div className="space-y-1.5 text-sm">
      {items.map((it, i) => {
        const pct = total ? Math.round((it.count / total) * 100) : 0;
        return (
          <div key={it.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="truncate flex-1" title={it.label}>{it.label}</span>
            <span className="text-muted-foreground tabular-nums text-xs whitespace-nowrap">
              {it.count} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  items, total, centerLabel,
}: { items: { label: string; count: number }[]; total: number; centerLabel?: string }) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Tidak ada data</div>;
  }
  return (
    <div className="grid md:grid-cols-2 gap-4 items-center">
      <div className="relative h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="label"
              innerRadius="60%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {items.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-3xl font-bold tabular-nums">{total}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {centerLabel ?? "Total"}
          </div>
        </div>
      </div>
      <div className="max-h-[240px] overflow-y-auto pr-1">
        <Legend2 items={items} total={total} />
      </div>
    </div>
  );
}

function PieChartFull({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Tidak ada data</div>;
  }
  return (
    <div className="grid md:grid-cols-2 gap-4 items-center">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="label"
              outerRadius="90%"
              stroke="hsl(var(--background))"
              strokeWidth={2}
              label={({ percent }) => percent > 0.06 ? `${Math.round(percent * 100)}%` : ""}
              labelLine={false}
            >
              {items.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="max-h-[240px] overflow-y-auto pr-1">
        <Legend2 items={items} total={total} />
      </div>
    </div>
  );
}

function HBarChart({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Tidak ada data</div>;
  }
  const data = items.slice(0, 12);
  const height = Math.max(240, data.length * 32);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tick={{ fill: "hsl(var(--foreground))" }}
          />
          <Tooltip content={<ChartTooltip total={total} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, tone = "primary",
}: { icon: any; label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4">
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10"
        style={{ background: `hsl(var(--${tone}))` }}
      />
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

export function GuruStats({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(true);
  const total = rows.length;

  const byJK = useMemo(() => groupBy(rows, (r) => {
    if (r.jenis_kelamin === "L") return "Laki-laki";
    if (r.jenis_kelamin === "P") return "Perempuan";
    return null;
  }), [rows]);
  const byKualifikasi = useMemo(() => groupBy(rows, (r) => r.kualifikasi_pendidikan), [rows]);
  const byStatus = useMemo(() => groupBy(rows, (r) => r.status_kepegawaian), [rows]);
  const byMapel = useMemo(() => groupBy(rows, (r) => r.mapel_nama && r.mapel_nama !== "—" ? r.mapel_nama : null), [rows]);
  const byKonsentrasi = useMemo(() => groupBy(rows, (r) => r.konsentrasi_nama), [rows]);

  const jkL = byJK.find((x) => x.label === "Laki-laki")?.count ?? 0;
  const jkP = byJK.find((x) => x.label === "Perempuan")?.count ?? 0;
  const asn = byStatus.filter((s) => ["PNS", "PPPK", "CPNS"].includes(s.label)).reduce((a, b) => a + b.count, 0);
  const uniqueMapel = byMapel.filter((m) => m.label !== "Tidak Diisi").length;

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Statistik Guru</CardTitle>
            <p className="text-xs text-muted-foreground">Distribusi data guru & tenaga pendidik</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Users} label="Total Guru" value={total} sub={`${jkL}L · ${jkP}P`} tone="primary" />
            <KpiCard icon={Briefcase} label="ASN (PNS+PPPK)" value={asn} sub={total ? `${Math.round((asn / total) * 100)}% dari total` : "—"} />
            <KpiCard icon={BookOpen} label="Mata Pelajaran" value={uniqueMapel} sub="Mapel diampu" />
            <KpiCard icon={Sparkles} label="Konsentrasi" value={byKonsentrasi.filter((k) => k.label !== "Tidak Diisi").length} sub="Bidang keahlian" />
          </div>

          <Tabs defaultValue="jk">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="jk">Jenis Kelamin</TabsTrigger>
              <TabsTrigger value="kualifikasi">Kualifikasi</TabsTrigger>
              <TabsTrigger value="status">Status Kepegawaian</TabsTrigger>
              <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
              <TabsTrigger value="konsentrasi">Konsentrasi Keahlian</TabsTrigger>
            </TabsList>
            <TabsContent value="jk" className="mt-4">
              <DonutChart items={byJK} total={total} centerLabel="Total Guru" />
            </TabsContent>
            <TabsContent value="kualifikasi" className="mt-4">
              <PieChartFull items={byKualifikasi} total={total} />
            </TabsContent>
            <TabsContent value="status" className="mt-4">
              <DonutChart items={byStatus} total={total} centerLabel="Status" />
            </TabsContent>
            <TabsContent value="mapel" className="mt-4">
              <HBarChart items={byMapel} total={total} />
            </TabsContent>
            <TabsContent value="konsentrasi" className="mt-4">
              <HBarChart items={byKonsentrasi} total={total} />
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
