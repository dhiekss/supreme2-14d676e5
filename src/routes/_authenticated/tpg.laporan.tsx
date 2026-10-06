import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteLaporan, getLaporanTpgDashboard, listGuru, signTpgBukti } from "@/lib/tpg.functions";
import { hitungPerkiraanTpg } from "@/lib/tpg-gaji";
import { CheckCircle2, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BULAN_FULL, fmtRp, TpgHeader, LaporanFormDialog } from "@/components/tpg/shared";

const guruQO = queryOptions({
  queryKey: ["tpg-guru"],
  queryFn: () => listGuru(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/_authenticated/tpg/laporan")({
  ssr: false,
  head: () => ({ meta: [{ title: "Lapor TPG — SUPREME XPOES" }] }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(guruQO);
    return null;
  },
  component: LaporanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {(error as Error).message}</div>,
});

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function KeteranganBadge({ nominal, perkiraan }: { nominal: number; perkiraan: number | null }) {
  if (perkiraan == null) return <span className="text-muted-foreground">—</span>;
  if (nominal < perkiraan) return <Badge variant="destructive">Kurang Bayar</Badge>;
  if (nominal > perkiraan) return <Badge variant="secondary">Lebih Bayar</Badge>;
  return <Badge>Nominal Sesuai</Badge>;
}

function LaporanPage() {
  const qc = useQueryClient();
  const dashFn = useServerFn(getLaporanTpgDashboard);
  const delFn = useServerFn(deleteLaporan);
  const signFn = useServerFn(signTpgBukti);

  const [guruId, setGuruId] = useState<string | undefined>(undefined);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);

  const { data: dash } = useSuspenseQuery({
    queryKey: ["tpg-lap-dashboard", guruId ?? "own"],
    queryFn: () => dashFn({ data: { guru_id: guruId } }),
  });

  const { data: guruList = [] } = useQuery({ ...guruQO, enabled: dash.is_admin });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dihapus");
      qc.invalidateQueries({ queryKey: ["tpg-lap-dashboard"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function viewBukti(pathOrUrl: string) {
    try {
      if (/^https?:\/\//.test(pathOrUrl)) {
        setBuktiUrl(pathOrUrl);
      } else {
        const res = await signFn({ data: { path: pathOrUrl } });
        if (!res.url) throw new Error("Bukti tidak ditemukan");
        setBuktiUrl(res.url);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuka bukti");
    }
  }

  const guru = dash.guru;
  const ref = dash.referensi;
  const laporan: any[] = dash.laporan ?? [];
  const perkiraanNow = ref ? hitungPerkiraanTpg(ref.gaji_efektif, ref.besaran_pajak, ref.besaran_bpjs) : null;
  const onSaved = () => qc.invalidateQueries({ queryKey: ["tpg-lap-dashboard"] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <TpgHeader title="Lapor TPG" desc="Laporkan penerimaan Tunjangan Profesi Guru (TPG) Anda di sini." />
        {guru && (
          <LaporanFormDialog
            guruId={guru.id}
            referensi={ref}
            onSaved={onSaved}
            trigger={
              <Button>
                <Plus className="mr-1.5 h-4 w-4" /> Tambah Laporan
              </Button>
            }
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih Guru</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={guru?.id ?? ""}
            onValueChange={(v) => setGuruId(v)}
            disabled={!dash.is_admin}
          >
            <SelectTrigger>
              <SelectValue placeholder={dash.is_admin ? "Pilih guru" : "Akun belum terhubung ke data guru"} />
            </SelectTrigger>
            <SelectContent>
              {(dash.is_admin ? guruList : guru ? [guru] : []).map((g: any) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nama} {g.nip ? `(${g.nip})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!dash.is_admin && (
            <p className="mt-2 text-xs text-muted-foreground">
              Terkunci pada akun Anda — laporan hanya bisa diisi untuk data Anda sendiri.
            </p>
          )}
        </CardContent>
      </Card>

      {!guru && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {dash.is_admin
              ? "Silakan pilih guru di atas untuk melihat informasi TPG."
              : "Akun Anda belum terhubung dengan data guru (NIP). Hubungi admin untuk menghubungkannya."}
          </CardContent>
        </Card>
      )}

      {guru && ref && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi TPG – {guru.nama}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="Nama" value={guru.nama} />
              <InfoItem label="Pangkat/Golongan" value={ref.pangkat_golongan ?? "—"} />
              <div>
                <div className="text-xs text-muted-foreground">Gaji Pokok Efektif (saat ini)</div>
                <div className="text-lg font-bold text-primary">{fmtRp(ref.gaji_efektif)}</div>
                <div className="text-xs text-muted-foreground">Awal: {fmtRp(ref.gaji_pokok)}</div>
              </div>
              <InfoItem label="Besaran Pajak" value={`${ref.besaran_pajak ?? 0}%`} />
              <InfoItem label="BPJS" value={`${ref.besaran_bpjs ?? 0}%`} />
            </div>
            {perkiraanNow != null && (
              <div className="space-y-1 rounded-lg bg-muted/50 p-4">
                <div className="text-xs text-muted-foreground">Perkiraan Nominal Diterima (saat ini)</div>
                <div className="text-2xl font-bold">{fmtRp(perkiraanNow)}</div>
                <div className="text-xs text-muted-foreground">
                  = {fmtRp(ref.gaji_efektif)} - Pajak ({ref.besaran_pajak ?? 0}%) - BPJS ({ref.besaran_bpjs ?? 0}%)
                </div>
                {(ref.kenaikan?.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Sudah memperhitungkan kenaikan gaji berkala terbaru
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {guru && !ref && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Data referensi TPG untuk guru ini belum diatur. Hubungi admin TPG.
          </CardContent>
        </Card>
      )}

      {guru && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat Laporan TPG</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Nominal Diterima</TableHead>
                  <TableHead>Perkiraan</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Bukti</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporan.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Belum ada laporan
                    </TableCell>
                  </TableRow>
                ) : (
                  laporan.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {BULAN_FULL[r.bulan - 1]} {r.tahun}
                      </TableCell>
                      <TableCell>{fmtRp(r.nominal_diterima)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.perkiraan != null ? fmtRp(r.perkiraan) : "—"}
                      </TableCell>
                      <TableCell>
                        <KeteranganBadge nominal={Number(r.nominal_diterima ?? 0)} perkiraan={r.perkiraan} />
                      </TableCell>
                      <TableCell>
                        {r.bukti_transfer_url ? (
                          <Button size="sm" variant="ghost" onClick={() => viewBukti(r.bukti_transfer_url)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <LaporanFormDialog guruId={guru.id} referensi={ref} item={r} onSaved={onSaved} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Hapus laporan ini?")) del.mutate(r.id);
                          }}
                        >
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
      )}

      <Dialog open={!!buktiUrl} onOpenChange={(o) => !o && setBuktiUrl(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bukti Transfer</DialogTitle>
          </DialogHeader>
          {buktiUrl && (
            <img src={buktiUrl} alt="Bukti transfer TPG" className="w-full rounded-md border object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
