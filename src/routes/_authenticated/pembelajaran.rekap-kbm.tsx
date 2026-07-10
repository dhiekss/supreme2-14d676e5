import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listAgenda } from "@/lib/kbm.functions";
import { ListChecks } from "lucide-react";

const agendaQO = queryOptions({
  queryKey: ["kbm-agenda"],
  queryFn: () => listAgenda({ data: { limit: 200 } }),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/rekap-kbm")({
  head: () => ({ meta: [{ title: "Rekap KBM — SUPREME EXPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(agendaQO),
  component: RekapKbmPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

function RekapKbmPage() {
  const { data: agenda } = useSuspenseQuery(agendaQO);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return agenda;
    return agenda.filter((a: any) =>
      [a.tanggal, a.rombel_name, a.mapel_name, a.guru_name, a.materi_detail]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(s)),
    );
  }, [agenda, q]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Rekap KBM
          </h1>
          <p className="text-sm text-muted-foreground">Riwayat pelaksanaan KBM yang sudah dilaporkan.</p>
        </div>
        <Input
          placeholder="Cari tanggal, rombel, mapel, guru..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Laporan ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jam</TableHead>
                <TableHead>Rombel</TableHead>
                <TableHead>Mapel</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Materi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Belum ada laporan
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{a.tanggal}</TableCell>
                  <TableCell>{a.jam_ke ?? "—"}</TableCell>
                  <TableCell>{a.rombel_name}</TableCell>
                  <TableCell>{a.mapel_name}</TableCell>
                  <TableCell>{a.guru_name}</TableCell>
                  <TableCell>
                    <Badge variant={a.guru_status === "Hadir" ? "default" : "secondary"}>
                      {a.guru_status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">{a.materi_detail ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
