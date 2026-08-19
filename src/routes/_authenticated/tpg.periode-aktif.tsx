import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listPeriodeAktif } from "@/lib/tpg.functions";
import { CheckCircle2 } from "lucide-react";
import { BULAN, TpgHeader } from "@/components/tpg/shared";

export const Route = createFileRoute("/_authenticated/tpg/periode-aktif")({
  ssr: false,
  head: () => ({ meta: [{ title: "Periode Aktif TPG — SUPREME XPOES" }] }),
  component: PeriodeAktifPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function PeriodeAktifPage() {
  const fetchFn = useServerFn(listPeriodeAktif);
  const { data: rows } = useSuspenseQuery({
    queryKey: ["tpg-periode"], queryFn: () => fetchFn(),
  });
  return (
    <div className="space-y-6">
      <TpgHeader title="Periode Aktif" desc="Daftar periode Tunjangan Profesi Guru." />
      <Card>
        <CardHeader><CardTitle className="text-base">Periode Aktif — {rows.length}</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
