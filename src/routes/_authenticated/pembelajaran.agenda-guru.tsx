import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  UserSearch, CalendarDays, Clock, BookOpen, CheckCircle2,
  Upload, Camera, Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import {
  listGuruForAgenda, listJadwalAgenda, upsertAgendaGuru, getAgendaDetail,
} from "@/lib/agenda-guru.functions";

export const Route = createFileRoute("/_authenticated/pembelajaran/agenda-guru")({
  head: () => ({ meta: [{ title: "Agenda Guru — SUPREME XPOES" }] }),
  component: AgendaGuruPage,
  errorComponent: ({ error }) => (<div className="text-destructive p-6">Gagal: {error.message}</div>),
});

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

type GStatus = "masuk" | "tidak_masuk_dengan_tugas" | "tidak_masuk_tanpa_tugas";
type KStatus = "hadir" | "sakit" | "izin" | "alfa" | "dispensasi" | "bolos_kelas";

const G_OPTS: { v: GStatus; short: string; label: string; color: string }[] = [
  { v: "masuk", short: "M", label: "Masuk", color: "bg-green-500 text-white" },
  { v: "tidak_masuk_dengan_tugas", short: "T+", label: "Tidak Masuk + Tugas", color: "bg-amber-500 text-white" },
  { v: "tidak_masuk_tanpa_tugas", short: "T-", label: "Tidak Masuk Tanpa Tugas", color: "bg-red-500 text-white" },
];
const G_LABEL: Record<GStatus, string> = { masuk: "Masuk", tidak_masuk_dengan_tugas: "Tidak Masuk + Tugas", tidak_masuk_tanpa_tugas: "Tidak Masuk Tanpa Tugas" };

const K_OPTS: { v: KStatus; label: string; dot: string }[] = [
  { v: "hadir", label: "Hadir", dot: "bg-green-500" },
  { v: "sakit", label: "Sakit", dot: "bg-amber-500" },
  { v: "izin", label: "Izin", dot: "bg-blue-500" },
  { v: "alfa", label: "Alfa", dot: "bg-red-500" },
  { v: "dispensasi", label: "Dispensasi", dot: "bg-purple-500" },
  { v: "bolos_kelas", label: "Bolos Kelas", dot: "bg-orange-500" },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatTanggal(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${HARI_ID[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

async function compressImage(file: File, maxKB = 200): Promise<string> {
  const bmpUrl = URL.createObjectURL(file);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = bmpUrl; });
  const maxDim = 1280;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const s = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * s); height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(bmpUrl);
  let q = 0.9;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length / 1024 > maxKB && q > 0.3) {
    q -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  return dataUrl;
}

function AgendaGuruPage() {
  const fetchGuru = useServerFn(listGuruForAgenda);
  const guruQ = useQuery({ queryKey: ["agenda-guru-list"], queryFn: () => fetchGuru() });

  const [guruId, setGuruId] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(todayIso());

  useEffect(() => {
    if (!guruId && guruQ.data?.rows?.length) setGuruId(guruQ.data.rows[0].id);
  }, [guruQ.data, guruId]);

  const fetchJadwal = useServerFn(listJadwalAgenda);
  const jadwalQ = useQuery({
    queryKey: ["agenda-jadwal", guruId, tanggal],
    queryFn: () => fetchJadwal({ data: { guruId, tanggal } }),
    enabled: !!guruId && !!tanggal,
  });

  const selectedGuru = useMemo(() => guruQ.data?.rows?.find((g: any) => g.id === guruId), [guruQ.data, guruId]);
  const [openSlot, setOpenSlot] = useState<any>(null);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda Guru</h1>
        <p className="text-sm text-muted-foreground mt-1">Isi agenda mengajar harian sesuai jadwal.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <UserSearch className="h-4 w-4 text-muted-foreground" /> Pilih Guru
              </Label>
              <Select value={guruId} onValueChange={setGuruId}>
                <SelectTrigger className="h-11 bg-muted/30 border-0"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {(guruQ.data?.rows ?? []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.nama}{g.nip ? ` (${g.nip})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> Tanggal Pengisian
              </Label>
              <div className="relative">
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-11 bg-muted/30 border-0 pl-10" />
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{formatTanggal(tanggal)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGuru && (
        <div className="text-sm">
          <span className="text-muted-foreground">Jadwal: </span>
          <span className="font-semibold">{selectedGuru.nama}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          {jadwalQ.isLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>
          ) : !jadwalQ.data || jadwalQ.data.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <div className="font-semibold">Tidak Ada Jadwal Hari Ini</div>
              <p className="text-sm text-muted-foreground mt-1">Guru ini tidak memiliki jadwal mengajar pada hari ini.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jadwalQ.data.map((slot: any, idx: number) => (
                <div key={idx} className="rounded-xl border p-4 flex flex-col gap-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Jam ke-{slot.jam_ke_start}{slot.jam_ke_end !== slot.jam_ke_start ? ` – ${slot.jam_ke_end}` : ""}
                    </div>
                    {slot.sudah_diisi ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Sudah Diisi
                      </Badge>
                    ) : (<Badge variant="outline">Belum Diisi</Badge>)}
                  </div>
                  {(slot.jam_mulai || slot.jam_selesai) && (
                    <div className="text-sm text-muted-foreground">{slot.jam_mulai ?? ""} – {slot.jam_selesai ?? ""}</div>
                  )}
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Kelas</div>
                    <div className="font-medium">{slot.rombel_name}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Mata Pelajaran</div>
                    <div className="font-medium">{slot.mapel_nama}</div>
                  </div>
                  <Button className="w-full mt-auto" onClick={() => setOpenSlot(slot)}>
                    {slot.sudah_diisi ? "Ubah Agenda" : "Isi Agenda"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AgendaDialog slot={openSlot} guruId={guruId} guruNama={selectedGuru?.nama ?? ""} tanggal={tanggal} onClose={() => setOpenSlot(null)} />
    </div>
  );
}

function AgendaDialog({
  slot, guruId, tanggal, onClose,
}: { slot: any; guruId: string; guruNama: string; tanggal: string; onClose: () => void }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertAgendaGuru);
  const detailFn = useServerFn(getAgendaDetail);

  const detailQ = useQuery({
    queryKey: ["agenda-detail", guruId, tanggal, slot?.rombel_id, slot?.mata_pelajaran_id, slot?.jam_list?.join(",")],
    queryFn: () => detailFn({ data: { guruId, tanggal, rombelId: slot.rombel_id, mataPelajaranId: slot.mata_pelajaran_id, jamList: slot.jam_list } }),
    enabled: !!slot,
  });

  const [perJamStatus, setPerJamStatus] = useState<Record<string, GStatus>>({});
  const [tpId, setTpId] = useState<string>("");
  const [materi, setMateri] = useState("");
  const [foto, setFoto] = useState<string>("");
  const [ttd, setTtd] = useState<string>("");
  const [kehadiran, setKehadiran] = useState<Record<string, KStatus>>({});
  const [tab, setTab] = useState("status");
  const sigRef = useRef<SignaturePadHandle>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!slot || !detailQ.data) return;
    const d = detailQ.data;
    const pjs: Record<string, GStatus> = {};
    for (const j of slot.jam_list) pjs[String(j)] = (d.perJam?.[j]?.guru_status ?? "masuk") as GStatus;
    setPerJamStatus(pjs);
    setTpId(d.tujuan_pembelajaran_id ?? "");
    setMateri(d.materi_detail ?? "");
    setFoto(d.foto_dokumentasi ?? "");
    setTtd(d.ttd_guru ?? "");
    const kh: Record<string, KStatus> = {};
    for (const s of d.students ?? []) kh[s.id] = (d.kehadiran?.[s.id] ?? "hadir") as KStatus;
    setKehadiran(kh);
  }, [detailQ.data, slot]);

  const save = useMutation({
    mutationFn: () => {
      let ttdFinal = ttd;
      if (sigRef.current && !sigRef.current.isEmpty()) ttdFinal = sigRef.current.toDataURL();
      return saveFn({
        data: {
          guruId, tanggal,
          rombelId: slot.rombel_id, mataPelajaranId: slot.mata_pelajaran_id,
          jamList: slot.jam_list,
          perJamStatus,
          tujuanPembelajaranId: tpId || null,
          materiDetail: materi,
          fotoDokumentasi: foto,
          ttdGuru: ttdFinal,
          kehadiran,
        },
      });
    },
    onSuccess: () => {
      toast.success("Agenda tersimpan");
      qc.invalidateQueries({ queryKey: ["agenda-jadwal"] });
      qc.invalidateQueries({ queryKey: ["agenda-detail"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!slot) return null;
  const jamLabel = `Jam ke-${slot.jam_ke_start}${slot.jam_ke_end !== slot.jam_ke_start ? ` – ${slot.jam_ke_end}` : ""}`;

  const onFile = async (f: File | null) => {
    if (!f) return;
    try {
      const url = await compressImage(f);
      setFoto(url);
      toast.success("Foto berhasil diproses");
    } catch { toast.error("Gagal memproses foto"); }
  };

  const setAllStatus = (v: GStatus) => {
    const next: Record<string, GStatus> = {};
    for (const j of slot.jam_list) next[String(j)] = v;
    setPerJamStatus(next);
  };

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Isi Agenda KBM – {jamLabel}</DialogTitle>
          <DialogDescription>
            {slot.rombel_name} | {slot.mapel_nama} | {formatTanggal(tanggal)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="status">Status Guru</TabsTrigger>
            <TabsTrigger value="hadir">Kehadiran</TabsTrigger>
            <TabsTrigger value="tp">TP & Materi</TabsTrigger>
            <TabsTrigger value="doc">Dokumentasi</TabsTrigger>
            <TabsTrigger value="ttd">Tanda Tangan</TabsTrigger>
          </TabsList>

          {/* STATUS GURU */}
          <TabsContent value="status" className="space-y-4 pt-4">
            <div>
              <div className="font-semibold">Keterangan Kehadiran Guru per Jam</div>
              <div className="text-sm text-muted-foreground">Atur status kehadiran guru untuk setiap jam pelajaran</div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-sm mb-2">Atur semua jam sekaligus:</div>
              <div className="flex flex-wrap gap-2">
                {G_OPTS.map((o) => (
                  <Button key={o.v} variant="outline" size="sm" onClick={() => setAllStatus(o.v)}>
                    <span className={cn("inline-flex items-center justify-center rounded w-6 h-6 mr-2 text-xs font-bold", o.color)}>{o.short}</span>
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {slot.jam_list.map((j: number) => {
                const cur = perJamStatus[String(j)] ?? "masuk";
                return (
                  <div key={j} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="font-medium">Jam ke-{j}:</div>
                    <div className="flex items-center gap-2">
                      {G_OPTS.map((o) => (
                        <button key={o.v} type="button"
                          onClick={() => setPerJamStatus((s) => ({ ...s, [String(j)]: o.v }))}
                          className={cn("rounded w-9 h-9 text-xs font-bold border", cur === o.v ? o.color + " border-transparent" : "bg-muted text-muted-foreground border-transparent")}>
                          {o.short}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground min-w-[110px] text-right">({G_LABEL[cur]})</div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-4 text-xs pt-2 border-t">
              {G_OPTS.map((o) => (
                <div key={o.v} className="flex items-center gap-2">
                  <span className={cn("inline-block w-4 h-4 rounded", o.color)} />
                  {o.short} = {o.label}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* KEHADIRAN */}
          <TabsContent value="hadir" className="space-y-4 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold">Daftar Hadir Murid</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {K_OPTS.map((o) => (
                  <div key={o.v} className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                    <span className={cn("inline-block w-2 h-2 rounded-full", o.dot)} />{o.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_100px_160px] gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold">
                <div>No</div><div>Nama Siswa</div><div>NIS</div><div>Status KBM</div>
              </div>
              <div className="divide-y">
                {(detailQ.data?.students ?? []).map((s: any, i: number) => (
                  <div key={s.id} className="grid grid-cols-[40px_1fr_100px_160px] gap-2 px-3 py-2 items-center text-sm">
                    <div>{i + 1}</div>
                    <div className="uppercase">{s.name}</div>
                    <div className="text-muted-foreground">{s.nis ?? "-"}</div>
                    <Select value={kehadiran[s.id] ?? "hadir"} onValueChange={(v) => setKehadiran((k) => ({ ...k, [s.id]: v as KStatus }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {K_OPTS.map((o) => (
                          <SelectItem key={o.v} value={o.v}>
                            <span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", o.dot)} />{o.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {(!detailQ.data?.students || detailQ.data.students.length === 0) && (
                  <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada siswa</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TP & MATERI */}
          <TabsContent value="tp" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tujuan Pembelajaran (TP)</Label>
              <Textarea
                rows={3}
                placeholder="Tuliskan tujuan pembelajaran..."
                value={tpId}
                onChange={(e) => setTpId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Detail Materi yang Disampaikan</Label>
              <Textarea rows={6} placeholder="Tuliskan materi yang disampaikan pada pertemuan ini..." value={materi} onChange={(e) => setMateri(e.target.value)} />
            </div>
          </TabsContent>

          {/* DOKUMENTASI */}
          <TabsContent value="doc" className="space-y-4 pt-4">
            <div className="font-semibold">Dokumentasi Foto Kegiatan</div>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => galleryRef.current?.click()}
                className="rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 hover:bg-muted/30">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm">Pilih dari Galeri</div>
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()}
                className="rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 hover:bg-muted/30">
                <Camera className="h-6 w-6 text-muted-foreground" />
                <div className="text-sm">Ambil Foto</div>
              </button>
              <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </div>
            <p className="text-xs text-muted-foreground">Foto akan otomatis dikompresi menjadi maksimal 200KB</p>
            {foto && (
              <div className="space-y-2">
                <img src={foto} alt="Dokumentasi" className="rounded-lg border max-h-72 object-contain" />
                <Button variant="outline" size="sm" onClick={() => setFoto("")}>Hapus Foto</Button>
              </div>
            )}
          </TabsContent>

          {/* TANDA TANGAN */}
          <TabsContent value="ttd" className="space-y-3 pt-4">
            <div className="font-semibold">Tanda Tangan Guru</div>
            {ttd && !sigRef.current ? (
              <div className="space-y-2">
                <img src={ttd} alt="Tanda tangan" className="rounded-lg border bg-white max-h-48" />
                <Button variant="outline" size="sm" onClick={() => setTtd("")}><Eraser className="h-4 w-4 mr-1" />Ganti Tanda Tangan</Button>
              </div>
            ) : (
              <>
                <SignaturePad ref={sigRef} className="w-full h-48 rounded-lg border-2 border-dashed bg-white" />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Gambar tanda tangan di area di atas</div>
                  <Button variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>
                    <Eraser className="h-4 w-4 mr-1" />Hapus Tanda Tangan
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : `Simpan (${slot.jam_list.length} Jam)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
