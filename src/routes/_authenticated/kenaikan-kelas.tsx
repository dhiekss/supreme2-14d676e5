import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GraduationCap, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listKenaikanRefs, previewPromotion, commitPromotion,
  listPromotionBatches, undoPromotionBatch, undoPromotionStudent,
} from "@/lib/kenaikan.functions";

export const Route = createFileRoute("/_authenticated/kenaikan-kelas")({
  head: () => ({ meta: [{ title: "Kenaikan Kelas — SUPREME XPOES" }] }),
  component: Page,
});

type Status = "naik" | "tinggal" | "lulus" | "keluar";
type Item = { student_id: string; name: string; nis: string | null; status: Status; locked?: boolean; rombel_tujuan_override?: string | null };

function Page() {
  const qc = useQueryClient();
  const refsFn = useServerFn(listKenaikanRefs);
  const previewFn = useServerFn(previewPromotion);
  const commitFn = useServerFn(commitPromotion);
  const batchesFn = useServerFn(listPromotionBatches);
  const undoFn = useServerFn(undoPromotionBatch);
  const undoStudentFn = useServerFn(undoPromotionStudent);

  const { data: refs } = useQuery({ queryKey: ["kenaikan-refs"], queryFn: () => refsFn() });
  const rombelList = refs?.rombel ?? [];
  const tahunList = refs?.tahun ?? [];
  const semesterList = refs?.semester ?? [];

  const [rombelAsal, setRombelAsal] = useState<string>("");
  const [rombelTujuan, setRombelTujuan] = useState<string>("");
  const [tahunTujuan, setTahunTujuan] = useState<string>("");
  const [semesterTujuan, setSemesterTujuan] = useState<string>("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [previewInfo, setPreviewInfo] = useState<{ isFinal: boolean } | null>(null);

  const tahunAsalDefault = useMemo(() => tahunList.find((t: any) => t.is_active)?.id ?? "", [tahunList]);
  const semesterAsalDefault = useMemo(() => semesterList.find((s: any) => s.is_active)?.id ?? "", [semesterList]);

  const semesterFiltered = semesterList.filter((s: any) => !tahunTujuan || s.tahun_ajaran_id === tahunTujuan);

  const loadPreview = useMutation({
    mutationFn: async (rid: string) => previewFn({ data: { rombel_asal_id: rid } }),
    onSuccess: (res) => {
      setItems(res.items);
      setPreviewInfo({ isFinal: res.isFinal });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const onSelectAsal = (v: string) => {
    setRombelAsal(v);
    setItems([]);
    setPreviewInfo(null);
    if (v) loadPreview.mutate(v);
  };

  const summary = useMemo(() => {
    const s = { naik: 0, tinggal: 0, lulus: 0, keluar: 0 };
    items.forEach((i) => { s[i.status]++; });
    return s;
  }, [items]);

  const commit = useMutation({
    mutationFn: () => commitFn({
      data: {
        rombel_asal_id: rombelAsal,
        rombel_tujuan_id: rombelTujuan || null,
        tahun_ajaran_asal_id: tahunAsalDefault || null,
        semester_asal_id: semesterAsalDefault || null,
        tahun_ajaran_tujuan_id: tahunTujuan || null,
        semester_tujuan_id: semesterTujuan || null,
        catatan: catatan || undefined,
        items: items.map((i) => ({
          student_id: i.student_id,
          status: i.status,
          rombel_tujuan_override: i.rombel_tujuan_override ?? null,
        })),
      },
    }),
    onSuccess: (r) => {
      toast.success(`Berhasil memproses ${r.count} siswa`);
      setItems([]);
      setRombelAsal("");
      setRombelTujuan("");
      setCatatan("");
      qc.invalidateQueries({ queryKey: ["kenaikan-refs"] });
      qc.invalidateQueries({ queryKey: ["kenaikan-batches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canCommit =
    rombelAsal && items.length > 0 && tahunTujuan && semesterTujuan &&
    (previewInfo?.isFinal || summary.naik === 0 || rombelTujuan);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Kenaikan Kelas
        </h1>
        <p className="text-sm text-muted-foreground">
          Proses kenaikan kelas per rombel. Data saat ini: semester genap 2025/2026.
        </p>
      </div>

      <Tabs defaultValue="proses">
        <TabsList>
          <TabsTrigger value="proses">Proses Kenaikan</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
        </TabsList>

        <TabsContent value="proses" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">1. Pilih Rombel & Periode Tujuan</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Rombel Asal *</Label>
                <Select value={rombelAsal} onValueChange={onSelectAsal}>
                  <SelectTrigger><SelectValue placeholder="Pilih rombel asal" /></SelectTrigger>
                  <SelectContent>
                    {rombelList.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} {r.tingkat ? `(${r.tingkat})` : ""} — {r.siswa_count} siswa
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rombel Tujuan (untuk status Naik)</Label>
                <Select value={rombelTujuan} onValueChange={setRombelTujuan} disabled={previewInfo?.isFinal}>
                  <SelectTrigger><SelectValue placeholder={previewInfo?.isFinal ? "Tidak diperlukan (kelas akhir)" : "Pilih rombel tujuan"} /></SelectTrigger>
                  <SelectContent>
                    {rombelList.filter((r: any) => r.id !== rombelAsal).map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} {r.tingkat ? `(${r.tingkat})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tahun Ajaran Tujuan *</Label>
                <Select value={tahunTujuan} onValueChange={(v) => { setTahunTujuan(v); setSemesterTujuan(""); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                  <SelectContent>
                    {tahunList.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester Tujuan *</Label>
                <Select value={semesterTujuan} onValueChange={setSemesterTujuan} disabled={!tahunTujuan}>
                  <SelectTrigger><SelectValue placeholder="Pilih semester" /></SelectTrigger>
                  <SelectContent>
                    {semesterFiltered.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Catatan</Label>
                <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Opsional" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">2. Daftar Siswa</CardTitle>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">Naik: {summary.naik}</Badge>
                <Badge variant="secondary">Tinggal: {summary.tinggal}</Badge>
                <Badge variant="secondary">Lulus: {summary.lulus}</Badge>
                <Badge variant="secondary">Keluar: {summary.keluar}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadPreview.isPending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat siswa...</div>}
              {!loadPreview.isPending && items.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Pilih rombel asal untuk memuat siswa.</div>
              )}
              {items.length > 0 && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nama</TableHead><TableHead>NIS</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead>Rombel Tujuan (override)</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {items.map((it, idx) => (
                      <TableRow key={it.student_id} className={it.locked ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{it.name}</TableCell>
                        <TableCell>{it.nis ?? "—"}</TableCell>
                        <TableCell>
                          <Select value={it.status} onValueChange={(v: Status) => {
                            setItems((prev) => prev.map((p, i) => i === idx ? { ...p, status: v } : p));
                          }} disabled={it.locked}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="naik">Naik</SelectItem>
                              <SelectItem value="tinggal">Tinggal</SelectItem>
                              <SelectItem value="lulus">Lulus</SelectItem>
                              <SelectItem value="keluar">Keluar</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {(it.status === "naik" || it.status === "tinggal") ? (
                            <Select
                              value={it.rombel_tujuan_override ?? ""}
                              onValueChange={(v) => setItems((prev) => prev.map((p, i) => i === idx ? { ...p, rombel_tujuan_override: v || null } : p))}
                            >
                              <SelectTrigger><SelectValue placeholder="(gunakan default)" /></SelectTrigger>
                              <SelectContent>
                                {rombelList.filter((r: any) => r.id !== rombelAsal).map((r: any) => (
                                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canCommit || commit.isPending} size="lg">
                  {commit.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Proses Kenaikan Kelas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmasi Kenaikan Kelas</AlertDialogTitle>
                  <AlertDialogDescription>
                    Akan memproses {items.length} siswa: {summary.naik} naik, {summary.tinggal} tinggal, {summary.lulus} lulus, {summary.keluar} keluar.
                    Aksi ini akan memperbarui rombel siswa dan menyimpan riwayat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => commit.mutate()}>Ya, Proses</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="riwayat">
          <RiwayatTab batchesFn={batchesFn} undoFn={undoFn} undoStudentFn={undoStudentFn} qc={qc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RiwayatTab({ batchesFn, undoFn, qc }: any) {
  const { data } = useQuery({ queryKey: ["kenaikan-batches"], queryFn: () => batchesFn() });
  const batches = data ?? [];
  const undo = useMutation({
    mutationFn: (batch_id: string) => undoFn({ data: { batch_id } }),
    onSuccess: () => {
      toast.success("Batch dibatalkan");
      qc.invalidateQueries({ queryKey: ["kenaikan-batches"] });
      qc.invalidateQueries({ queryKey: ["kenaikan-refs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const [openBatch, setOpenBatch] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Riwayat Batch Kenaikan</CardTitle></CardHeader>
      <CardContent>
        {batches.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Belum ada riwayat.</div>}
        {batches.length > 0 && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tanggal</TableHead><TableHead>Rombel Asal</TableHead>
              <TableHead>Rincian</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {batches.map((b: any) => (
                <Fragment key={b.batch_id}>
                  <TableRow>
                    <TableCell>{b.tanggal_proses}</TableCell>
                    <TableCell className="font-medium">{b.rombel_asal_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {b.counts.naik > 0 && <Badge variant="secondary">Naik: {b.counts.naik}</Badge>}
                        {b.counts.tinggal > 0 && <Badge variant="secondary">Tinggal: {b.counts.tinggal}</Badge>}
                        {b.counts.lulus > 0 && <Badge variant="secondary">Lulus: {b.counts.lulus}</Badge>}
                        {b.counts.keluar > 0 && <Badge variant="secondary">Keluar: {b.counts.keluar}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setOpenBatch(openBatch === b.batch_id ? null : b.batch_id)}>
                        {openBatch === b.batch_id ? "Tutup" : "Detail"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost"><Undo2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Batalkan Batch?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Rombel siswa akan dikembalikan ke rombel asal dan riwayat batch dihapus. Hanya admin yang dapat melakukan ini.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => undo.mutate(b.batch_id)}>Ya, Batalkan</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  {openBatch === b.batch_id && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/30">
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Nama</TableHead><TableHead>NIS</TableHead>
                            <TableHead>Status</TableHead><TableHead>Rombel Tujuan</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {b.items.map((it: any) => (
                              <TableRow key={it.id}>
                                <TableCell>{it.student_name}</TableCell>
                                <TableCell>{it.student_nis ?? "—"}</TableCell>
                                <TableCell><Badge variant="outline">{it.status}</Badge></TableCell>
                                <TableCell>{it.rombel_tujuan_name ?? "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
