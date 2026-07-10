import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const getMaster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [rombel, guru, mapel] = await Promise.all([
      supabase.from("rombel").select("id, name, tingkat, konsentrasi_keahlian, wali_kelas_name").order("tingkat").order("name"),
      supabase.from("guru").select("id, nip, nama, jenis_kelamin, kelompok_mapel").order("nama"),
      supabase.from("mata_pelajaran").select("id, kode, nama, kelompok").order("nama"),
    ]);
    return {
      rombel: rombel.data ?? [],
      guru: guru.data ?? [],
      mapel: mapel.data ?? [],
    };
  });

const masterQO = queryOptions({ queryKey: ["master-data"], queryFn: () => getMaster() });

export const Route = createFileRoute("/_authenticated/master")({
  head: () => ({ meta: [{ title: "Master Data — SUPREME XPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(masterQO),
  component: MasterPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal memuat: {error.message}</div>,
});

function MasterPage() {
  const { data } = useSuspenseQuery(masterQO);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Master Data</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Rombel" value={data.rombel.length} />
        <Stat label="Guru" value={data.guru.length} />
        <Stat label="Mata Pelajaran" value={data.mapel.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Rombel</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tingkat</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Konsentrasi</TableHead>
                <TableHead>Wali Kelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rombel.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.tingkat}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.konsentrasi_keahlian}</TableCell>
                  <TableCell>{r.wali_kelas_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Guru</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Kelompok Mapel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.guru.slice(0, 100).map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-xs">{g.nip}</TableCell>
                  <TableCell>{g.nama}</TableCell>
                  <TableCell>{g.jenis_kelamin}</TableCell>
                  <TableCell>{g.kelompok_mapel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.guru.length > 100 && (
            <p className="text-xs text-muted-foreground mt-2">Menampilkan 100 dari {data.guru.length} guru.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
    </Card>
  );
}
