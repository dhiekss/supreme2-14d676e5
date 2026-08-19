import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listGuru, listReferensi, deleteReferensi } from "@/lib/tpg.functions";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtRp, TpgHeader, ReferensiFormDialog } from "@/components/tpg/shared";

const guruQO = queryOptions({
  queryKey: ["tpg-guru"],
  queryFn: () => listGuru(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/_authenticated/tpg/referensi")({
  ssr: false,
  head: () => ({ meta: [{ title: "Referensi TPG — SUPREME XPOES" }] }),
  loader: ({ context }) => {
    // Non-blocking prefetch — halaman langsung render, data menyusul.
    void context.queryClient.prefetchQuery(guruQO);
    return null;
  },
  component: ReferensiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function ReferensiPage() {
  const qc = useQueryClient();
  const fetchRef = useServerFn(listReferensi);
  const delRefFn = useServerFn(deleteReferensi);

  const { data: guru = [] } = useQuery(guruQO);

  const { data: referensi } = useSuspenseQuery({
    queryKey: ["tpg-ref"], queryFn: () => fetchRef(),
  });

  const delRef = useMutation({
    mutationFn: (id: string) => delRefFn({ data: { id } }),
    onSuccess: () => { toast.success("Dihapus"); qc.invalidateQueries({ queryKey: ["tpg-ref"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <TpgHeader title="Referensi TPG" desc="Referensi gaji pokok, pajak, dan BPJS per guru." />
      <div className="flex justify-end">
        <ReferensiFormDialog guru={guru} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-ref"] })} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Referensi — {referensi.length}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIP</TableHead>
                <TableHead>Nama Guru</TableHead>
                <TableHead>Pangkat/Gol</TableHead>
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Pajak</TableHead>
                <TableHead>BPJS</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referensi.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada referensi</TableCell></TableRow>
              ) : referensi.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guru_nip}</TableCell>
                  <TableCell>{r.guru_nama}</TableCell>
                  <TableCell>{r.pangkat_golongan ?? "—"}</TableCell>
                  <TableCell>{fmtRp(r.gaji_pokok)}</TableCell>
                  <TableCell>{fmtRp(r.besaran_pajak)}</TableCell>
                  <TableCell>{fmtRp(r.besaran_bpjs)}</TableCell>
                  <TableCell className="text-right">
                    <ReferensiFormDialog guru={guru} item={r} onSaved={() => qc.invalidateQueries({ queryKey: ["tpg-ref"] })} />
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus?")) delRef.mutate(r.id); }}>
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
