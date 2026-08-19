import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listGuru, listReferensi, listLaporan, deleteLaporan } from "@/lib/tpg.functions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BULAN, fmtRp, TpgHeader, LaporanFormDialog } from "@/components/tpg/shared";

export const Route = createFileRoute("/_authenticated/tpg/laporan")({
  ssr: false,
  head: () => ({ meta: [{ title: "Laporan TPG — SUPREME XPOES" }] }),
  loader: async () => ({
    guru: await listGuru(),
    referensi: await listReferensi(),
  }),
  component: LaporanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function LaporanPage() {
  const { guru } = Route.useLoaderData();
  const qc = useQueryClient();
  const fetchRef = useServerFn(listReferensi);
  const fetchLap = useServerFn(listLaporan);
  const delLapFn = useServerFn(deleteLaporan);

  const { data: referensi } = useSuspenseQuery({
    queryKey: ["tpg-ref"], queryFn: () => fetchRef(),
  });

  const today = new Date();
  const [bulan, setBulan] = useState<string>(String(today.getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));

  const { data: laporan } = useSuspenseQuery({
    queryKey: ["tpg-lap", bulan, tahun],
    queryFn: () => fetchLap({ data: { bulan: Number(bulan), tahun: Number(tahun) } }),
  });

  const delLap = useMutation({
    mutationFn: (id: string) => delLapFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpg-lap"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalLap = laporan.reduce((s: number, r: any) => s + Number(r.nominal_diterima ?? 0), 0);

  return (
    <div className="space-y-6">
      <TpgHeader title="Laporan TPG" desc="Tunjangan Profesi Guru — laporan bulanan." />

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select value={bulan} onValueChange={setBulan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BULAN.map((b, i) => <SelectItem key={i} value={String(i+1)}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tahun</Label>
              <Input type="number" value={tahun} onChange={(e) => setTahun(e.target.value)} />
            </div>
            <div className="flex items-end">
              <LaporanFormDialog guru={guru} referensi={referensi} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-lap"] })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Laporan — {laporan.length} entri</CardTitle>
          <div className="text-sm font-semibold">Total: {fmtRp(totalLap)}</div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama Guru</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laporan.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada laporan</TableCell></TableRow>
              ) : laporan.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guru_nip}</TableCell>
                  <TableCell>{r.guru_nama}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell>{fmtRp(r.nominal_diterima)}</TableCell>
                  <TableCell>
                    {r.bukti_transfer_url ? (
                      <a href={r.bukti_transfer_url} target="_blank" rel="noreferrer" className="text-primary underline">Lihat</a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <LaporanFormDialog guru={guru} referensi={referensi} item={r} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-lap"] })} />
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) delLap.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
