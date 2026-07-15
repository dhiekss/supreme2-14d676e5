import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listRombel } from "@/lib/presensi.functions";
import {
  listKeterlambatan,
  deleteKeterlambatan,
} from "@/lib/keterlambatan.functions";
import { Trash2, Download, FileBarChart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/laporan-keterlambatan")({
  head: () => ({ meta: [{ title: "Laporan Keterlambatan — SUPREME XPOES" }] }),
  loader: async () => ({ rombel: await listRombel() }),
  component: LaporanKeterlambatanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function LaporanKeterlambatanPage() {
  const { rombel } = Route.useLoaderData();
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [filterRombel, setFilterRombel] = useState<string>("all");

  const qc = useQueryClient();
  const fetchList = useServerFn(listKeterlambatan);
  const removeFn = useServerFn(deleteKeterlambatan);

  const { data, isFetching } = useSuspenseQuery({
    queryKey: ["keterlambatan", from, to, filterRombel],
    queryFn: () =>
      fetchList({
        data: {
          from,
          to,
          rombelId: filterRombel === "all" ? undefined : filterRombel,
        },
      }),
  });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Catatan dihapus");
      qc.invalidateQueries({ queryKey: ["keterlambatan"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const uniqStudents = new Set(data.map((r: any) => r.student_id)).size;
    const uniqRombel = new Set(data.map((r: any) => r.rombel_id)).size;
    return { total: data.length, uniqStudents, uniqRombel };
  }, [data]);

  const exportExcel = () => {
    const rows = data.map((r: any, i: number) => ({
      No: i + 1,
      Tanggal: r.record_date,
      Jam: r.recorded_at
        ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "-",
      NIS: r.student_nis,
      Nama: r.student_name,
      Rombel: r.rombel_name,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 28 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keterlambatan");
    XLSX.writeFile(wb, `laporan-keterlambatan_${from}_sd_${to}.xlsx`);
    toast.success("File Excel diunduh");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Laporan Keterlambatan
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau catatan siswa yang terlambat datang ke sekolah.
          </p>
        </div>
        <Button variant="outline" onClick={exportExcel} disabled={data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Total Catatan</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Siswa Berbeda</div>
            <div className="text-2xl font-bold">{stats.uniqStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Rombel Terlibat</div>
            <div className="text-2xl font-bold">{stats.uniqRombel}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={filterRombel} onValueChange={setFilterRombel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua rombel</SelectItem>
                  {rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dari</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sampai</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar — {data.length} catatan {isFetching && "(memuat…)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada catatan</TableCell></TableRow>
              ) : (
                data.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.record_date}</TableCell>
                    <TableCell>{r.student_nis}</TableCell>
                    <TableCell>{r.student_name}</TableCell>
                    <TableCell>{r.rombel_name}</TableCell>
                    <TableCell>{r.recorded_at ? new Date(r.recorded_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus catatan ini?")) del.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
