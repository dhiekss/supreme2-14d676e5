import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp, Users, User } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Row = {
  nama: string | null;
  jenis_kelamin: string | null;
  status_kepegawaian: string | null;
  golongan: string | null;
};

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(340 82% 52%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
];

function groupByJK(rows: Row[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    let label: string;
    if (r.jenis_kelamin === "L") label = "Laki-laki";
    else if (r.jenis_kelamin === "P") label = "Perempuan";
    else label = "Tidak Diisi";
    map.set(label, (map.get(label) ?? 0) + 1);
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
        {value} tendik · {pct}%
      </div>
    </div>
  );
}

function Legend({ items, total }: { items: { label: string; count: number }[]; total: number }) {
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

export function TendikStats({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(true);
  const total = rows.length;
  const byJK = useMemo(() => groupByJK(rows), [rows]);
  const laki = byJK.find((x) => x.label === "Laki-laki")?.count ?? 0;
  const perempuan = byJK.find((x) => x.label === "Perempuan")?.count ?? 0;

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Statistik Tendik</CardTitle>
            <p className="text-xs text-muted-foreground">Distribusi tenaga kependidikan</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-xl border bg-card p-4">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 opacity-10" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                <Users className="h-4 w-4" />
                Total Tendik
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">{total}</div>
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-card p-4">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 opacity-10" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                <User className="h-4 w-4" />
                Laki-laki
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">{laki}</div>
              {total > 0 && <div className="text-xs text-muted-foreground mt-0.5">{Math.round((laki / total) * 100)}% dari total</div>}
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-card p-4">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-pink-500/10 opacity-10" />
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                <User className="h-4 w-4" />
                Perempuan
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums">{perempuan}</div>
              {total > 0 && <div className="text-xs text-muted-foreground mt-0.5">{Math.round((perempuan / total) * 100)}% dari total</div>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="relative h-[240px]">
              {byJK.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Tidak ada data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byJK}
                      dataKey="count"
                      nameKey="label"
                      innerRadius="60%"
                      outerRadius="85%"
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {byJK.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip total={total} />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-3xl font-bold tabular-nums">{total}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Tendik</div>
              </div>
            </div>
            <div className="max-h-[240px] overflow-y-auto pr-1">
              <Legend items={byJK} total={total} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
