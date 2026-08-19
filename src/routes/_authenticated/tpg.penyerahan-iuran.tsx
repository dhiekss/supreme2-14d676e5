import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listPenyerahanIuran } from "@/lib/tpg.functions";
import { BULAN, fmtRp, TpgHeader, PeriodeFilter } from "@/components/tpg/shared";

export const Route = createFileRoute("/_authenticated/tpg/penyerahan-iuran")({
  ssr: false,
  head: () => ({ meta: [{ title: "Penyerahan Iuran TPG — SUPREME XPOES" }] }),
  component: PenyerahanIuranPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function PenyerahanIuranPage() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>("all");
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const fetchFn = useServerFn(listPenyerahanIuran);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-iur", bulan, tahun],
    queryFn: () => fetchFn({ data: {
      bulan: bulan === "all" ? undefined : Number(bulan),
      tahun: Number(tahun),
    } }),
  });
  const total = rows.reduce((s: number, r: any) => s + Number(r.nominal ?? 0), 0);
  return (
    <div className="space-y-6">
      <TpgHeader title="Penyerahan Iuran" desc="Catatan penyerahan iuran Tunjangan Profesi Guru." />
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
