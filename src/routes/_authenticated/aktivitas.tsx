import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  listAktivitas,
  deleteAktivitas,
  clearOldAktivitas,
  aktivitasSummary,
} from "@/lib/aktivitas.functions";

export const Route = createFileRoute("/_authenticated/aktivitas")({
  head: () => ({ meta: [{ title: "Aktivitas / Audit Log — SUPREME XPOES" }] }),
  component: AktivitasPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function AktivitasPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");

  const fetchList = useServerFn(listAktivitas);
  const fetchSum = useServerFn(aktivitasSummary);
  const delFn = useServerFn(deleteAktivitas);
  const clearFn = useServerFn(clearOldAktivitas);

  const { data } = useSuspenseQuery({
    queryKey: ["aktivitas", search, action],
    queryFn: () => fetchList({ data: { search: search || undefined, action: action === "all" ? undefined : action } }),
  });
  const { data: sum } = useQuery({ queryKey: ["aktivitas-sum"], queryFn: () => fetchSum() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["aktivitas"] });
    qc.invalidateQueries({ queryKey: ["aktivitas-sum"] });
  };

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Log dihapus"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const clear = useMutation({
    mutationFn: (days: number) => clearFn({ data: { olderThanDays: days } }),
    onSuccess: (r) => { toast.success(`${r.deleted} log lama dihapus`); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const actionKeys = Object.keys(sum?.byAction ?? {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Aktivitas / Audit Log</h1>
          <p className="text-sm text-muted-foreground">Riwayat aksi pengguna di sistem</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => invalidate()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button variant="outline" onClick={() => { if (confirm("Hapus log >30 hari?")) clear.mutate(30); }}>
            <Trash2 className="h-4 w-4 mr-2" />Bersihkan {">"} 30 hari
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SumCard title="Total Log" value={sum?.total ?? 0} />
        <SumCard title="Hari Ini" value={sum?.today ?? 0} tone="text-primary" />
        <SumCard title="7 Hari Terakhir" value={sum?.week ?? 0} tone="text-blue-700" />
        <SumCard title="Jenis Aksi" value={actionKeys.length} tone="text-purple-700" />
      </div>

      <Card>
        <CardHeader className="flex flex-row gap-2 items-center flex-wrap">
          <Input
            placeholder="Cari email / nama / deskripsi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua aksi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua aksi</SelectItem>
              {actionKeys.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada aktivitas</TableCell></TableRow>
              )}
              {data.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.user_full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.user_email ?? "—"}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{r.action ?? "—"}</Badge></TableCell>
                  <TableCell className="text-sm max-w-md truncate" title={r.description ?? ""}>{r.description ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.ip_address ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus log ini?")) del.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
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

function SumCard({ title, value, tone }: { title: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div></CardContent>
    </Card>
  );
}
