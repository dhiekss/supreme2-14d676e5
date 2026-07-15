import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart3, ChevronDown, ChevronUp, Users } from "lucide-react";

type Row = {
  nama: string | null;
  jenis_kelamin: string | null;
  mapel_nama?: string;
  kualifikasi_pendidikan: string | null;
  status_kepegawaian: string | null;
  konsentrasi_nama?: string | null;
};

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

function StatList({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-4 text-center">Tidak ada data</div>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pct = total ? Math.round((it.count / total) * 100) : 0;
        return (
          <div key={it.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate pr-2">{it.label}</span>
              <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                {it.count} <span className="text-xs">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(it.count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Statistik Guru</CardTitle>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Users className="h-3 w-3" /> {total} total
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {open && (
        <CardContent>
          <Tabs defaultValue="jk">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="jk">Jenis Kelamin</TabsTrigger>
              <TabsTrigger value="kualifikasi">Kualifikasi</TabsTrigger>
              <TabsTrigger value="status">Status Kepegawaian</TabsTrigger>
              <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
              <TabsTrigger value="konsentrasi">Konsentrasi Keahlian</TabsTrigger>
            </TabsList>
            <TabsContent value="jk" className="mt-4"><StatList items={byJK} total={total} /></TabsContent>
            <TabsContent value="kualifikasi" className="mt-4"><StatList items={byKualifikasi} total={total} /></TabsContent>
            <TabsContent value="status" className="mt-4"><StatList items={byStatus} total={total} /></TabsContent>
            <TabsContent value="mapel" className="mt-4"><StatList items={byMapel} total={total} /></TabsContent>
            <TabsContent value="konsentrasi" className="mt-4"><StatList items={byKonsentrasi} total={total} /></TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
