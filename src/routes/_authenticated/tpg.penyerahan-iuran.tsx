import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPenyerahanIuran, getPenyerahanIuranStats } from "@/lib/tpg.functions";
import { BULAN, fmtRp, TpgHeader, PeriodeFilter } from "@/components/tpg/shared";
import { Building2, CheckCircle2, Landmark, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tpg/penyerahan-iuran")({
  ssr: false,
  head: () => ({ meta: [{ title: "Penyerahan Iuran TPG — SUPREME XPOES" }] }),
  component: PenyerahanIuranPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function StatCard({ label, value, icon, valueClass, cardClass }: {
  label: string; value: string; icon?: ReactNode; valueClass?: string; cardClass?: string;
}) {
  return (
    <Card className={cardClass}>
      <CardContent className="p-4 flex items-start gap-3">
        {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
        <div className="space-y-1 min-w-0">
          <div className="text-xs text-muted-foreground leading-tight">{label}</div>
          <div className={`text-lg font-bold leading-snug break-words ${valueClass ?? ""}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PenyerahanIuranPage() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>("all");
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const fetchFn = useServerFn(listPenyerahanIuran);
  const statsFn = useServerFn(getPenyerahanIuranStats);

  const filterData = {
    bulan: bulan === "all" ? undefined : Number(bulan),
    tahun: Number(tahun),
  };

  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-iur", bulan, tahun],
    queryFn: () => fetchFn({ data: filterData }),
  });
  const { data: stats } = useSuspenseQuery({
    queryKey: ["tpg-iur-stats", bulan, tahun],
    queryFn: () => statsFn({ data: filterData }),
  });

  const total = rows.reduce((s: number, r: any) => s + Number(r.nominal ?? 0), 0);

  return (
    <div className="space-y-6">
      <TpgHeader title="Penyerahan Iuran" desc="Catatan penyerahan iuran Tunjangan Profesi Guru." />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Laporan" value={String(stats.total_laporan)} />
        <StatCard
          label="Sudah Administrasi"
          value={String(stats.sudah_administrasi)}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          valueClass="text-green-600"
        />
        <StatCard
          label="Belum Administrasi"
          value={String(stats.belum_administrasi)}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          valueClass="text-red-600"
        />
        <StatCard
          label="Total Iuran Sekolah"
          value={fmtRp(stats.iuran_sekolah)}
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          valueClass="text-blue-600"
        />
        <StatCard
          label="Total Iuran Wilayah"
          value={fmtRp(stats.iuran_wilayah)}
          icon={<Landmark className="h-5 w-5 text-purple-500" />}
          valueClass="text-purple-600"
        />
        <StatCard label="Total Iuran" value={fmtRp(stats.total_iuran)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Iuran Sekolah Tersalur"
          value={fmtRp(stats.sekolah_tersalur)}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          valueClass="text-green-600"
          cardClass="bg-green-50 border-green-200"
        />
        <StatCard
          label="Iuran Wilayah Tersalur"
          value={fmtRp(stats.wilayah_tersalur)}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          valueClass="text-green-600"
          cardClass="bg-green-50 border-green-200"
        />
        <StatCard
          label="Total Iuran Tersalur"
          value={fmtRp(stats.total_tersalur)}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          valueClass="text-green-600"
          cardClass="bg-green-50 border-green-200"
        />
        <StatCard
          label="Sisa Iuran Sekolah"
          value={fmtRp(stats.sisa_sekolah)}
          icon={<XCircle className="h-5 w-5 text-orange-500" />}
          valueClass="text-orange-600"
          cardClass="bg-orange-50 border-orange-200"
        />
        <StatCard
          label="Sisa Iuran Wilayah"
          value={fmtRp(stats.sisa_wilayah)}
          icon={<XCircle className="h-5 w-5 text-orange-500" />}
          valueClass="text-orange-600"
          cardClass="bg-orange-50 border-orange-200"
        />
        <StatCard
          label="Total Sisa Iuran"
          value={fmtRp(stats.total_sisa)}
          icon={<XCircle className="h-5 w-5 text-orange-500" />}
          valueClass="text-orange-600"
          cardClass="bg-orange-50 border-orange-200"
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent><PeriodeFilter bulan={bulan} setBulan={setBulan} tahun={tahun} setTahun={setTahun} /></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Penyerahan Iuran — {rows.length} entri</CardTitle>
          <div className="text-sm font-semibold">Total: {fmtRp(total)}</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Keperluan</TableHead>
                <TableHead>Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tanggal_penyerahan ? new Date(r.tanggal_penyerahan).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell className="capitalize">{(r.keperluan ?? "—").replace(/_/g, " ")}</TableCell>
                  <TableCell>{fmtRp(r.nominal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
