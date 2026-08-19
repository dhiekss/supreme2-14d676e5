import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listAdministrasi } from "@/lib/tpg.functions";
import { CheckCircle2, XCircle } from "lucide-react";
import { BULAN, fmtRp, TpgHeader, PeriodeFilter } from "@/components/tpg/shared";

export const Route = createFileRoute("/_authenticated/tpg/administrasi")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administrasi TPG — SUPREME XPOES" }] }),
  component: AdministrasiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function AdministrasiPage() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>(String(today.getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const fetchFn = useServerFn(listAdministrasi);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-adm", bulan, tahun],
    queryFn: () => fetchFn({ data: {
      bulan: bulan === "all" ? undefined : Number(bulan),
      tahun: Number(tahun),
    } }),
  });
  const total = rows.reduce((s: number, r: any) => s + Number(r.nominal_iuran ?? 0), 0);
  const sudah = rows.filter((r: any) => r.sudah_administrasi).length;
  return (
    <div className="space-y-6">
      <TpgHeader title="Administrasi TPG" desc="Status administrasi Tunjangan Profesi Guru per periode." />
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent><PeriodeFilter bulan={bulan} setBulan={setBulan} tahun={tahun} setTahun={setTahun} /></CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Administrasi — {rows.length} entri ({sudah} sudah)</CardTitle>
          <div className="text-sm font-semibold">Total Iuran: {fmtRp(total)}</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama Guru</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nominal Iuran</TableHead>
                <TableHead>Tgl Administrasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guru_nip}</TableCell>
                  <TableCell>{r.guru_nama}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell>
                    {r.sudah_administrasi ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sudah</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell>{fmtRp(r.nominal_iuran)}</TableCell>
                  <TableCell>{r.tanggal_administrasi ? new Date(r.tanggal_administrasi).toLocaleDateString("id-ID") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
