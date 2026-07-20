import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getKelompokBelajarDetail } from "@/lib/kelompok-belajar.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, UserCheck } from "lucide-react";

const detailQO = (id: string) =>
  queryOptions({
    queryKey: ["kelompok-belajar-detail", id],
    queryFn: () => getKelompokBelajarDetail({ data: { id } }),
  });

export const Route = createFileRoute("/_authenticated/kelompok-belajar/$id")({
  head: () => ({ meta: [{ title: "Detail Kelompok Belajar — SUPREME XPOES" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailQO(params.id)),
  component: DetailPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Gagal memuat: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Kelompok belajar tidak ditemukan</div>,
});

function DetailPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(detailQO(id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/kelompok-belajar">
              <ArrowLeft className="mr-1 h-4 w-4" /> Kembali
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.nama}</h1>
            <p className="text-sm text-muted-foreground">Detail kelompok belajar</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Pembimbing
              <Badge variant="secondary" className="ml-auto">{data.pembimbings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pembimbings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pembimbing.</p>
            ) : (
              <ul className="space-y-2">
                {data.pembimbings.map((p) => (
                  <li
                    key={`${p.type}-${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border p-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.nama}</div>
                      {p.nip && (
                        <div className="text-xs text-muted-foreground font-mono">NIP: {p.nip}</div>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">{p.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Ringkasan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama Kelompok</span>
              <span className="font-medium">{data.nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Anggota</span>
              <span className="font-medium">{data.anggota.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah Pembimbing</span>
              <span className="font-medium">{data.pembimbings.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Anggota Murid
            <Badge variant="secondary" className="ml-auto">{data.anggota.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.anggota.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada anggota.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIS</TableHead>
                  <TableHead>Rombel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.anggota.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.nis ?? "—"}</TableCell>
                    <TableCell>
                      {s.rombel_name ? (
                        <span>
                          {s.rombel_tingkat && <span className="text-muted-foreground">{s.rombel_tingkat} — </span>}
                          {s.rombel_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
