import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listRombelForKbm,
  listMapelByRombel,
  listGuruByRombelMapel,
  listJadwalForKbm,
  uploadKbmMedia,
  createLaporanKbm,
} from "@/lib/lapor-kbm.functions";
import { getMyProfile } from "@/lib/me.functions";
import { BookOpen, Camera, ImageIcon, Save, RotateCcw, Eraser, X } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { cn } from "@/lib/utils";

const rombelQO = queryOptions({
  queryKey: ["lapor-kbm-rombel"],
  queryFn: () => listRombelForKbm(),
});

export const Route = createFileRoute("/_authenticated/pembelajaran/kbm")({
  head: () => ({ meta: [{ title: "Lapor KBM — SUPREME EXPOES" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(rombelQO),
  component: LaporKbmPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal memuat: {error.message}</div>,
});

const HOURS = Array.from({ length: 10 }, (_, i) => i + 1);

function LaporKbmPage() {
  const { data: rombelList } = useSuspenseQuery(rombelQO);
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });
  const isAdmin = !!meQ.data?.roles?.some((r) => r === "admin" || r === "superadmin");
  const [autoFilled, setAutoFilled] = useState(false);
  const locked = autoFilled && !isAdmin;
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [rombelId, setRombelId] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [jamList, setJamList] = useState<number[]>([]);
  const [jamStatus, setJamStatus] = useState<Record<number, "M" | "T+" | "T-">>({});
  const [fotoDataUrl, setFotoDataUrl] = useState<string>("");
  const [fotoExt, setFotoExt] = useState<string>("");

  const sigRef = useRef<SignaturePadHandle>(null);
  const fileCam = useRef<HTMLInputElement>(null);
  const fileGal = useRef<HTMLInputElement>(null);

  const mapelFn = useServerFn(listMapelByRombel);
  const guruFn = useServerFn(listGuruByRombelMapel);
  const jadwalFn = useServerFn(listJadwalForKbm);
  const uploadFn = useServerFn(uploadKbmMedia);
  const createFn = useServerFn(createLaporanKbm);

  const mapelQ = useQuery({
    queryKey: ["lapor-kbm-mapel", rombelId],
    queryFn: () => mapelFn({ data: { rombel_id: rombelId } }),
    enabled: !!rombelId,
  });

  const guruQ = useQuery({
    queryKey: ["lapor-kbm-guru", rombelId, mapelId],
    queryFn: () => guruFn({ data: { rombel_id: rombelId, mata_pelajaran_id: mapelId } }),
    enabled: !!rombelId && !!mapelId,
  });

  const jadwalQ = useQuery({
    queryKey: ["lapor-kbm-jadwal", rombelId, tanggal],
    queryFn: () => jadwalFn({ data: { rombel_id: rombelId, tanggal } }),
    enabled: !!rombelId && !!tanggal,
  });

  const applySession = (key: string) => {
    const sessions = jadwalQ.data?.sessions ?? [];
    const s = sessions.find((x: any) => `${x.mata_pelajaran_id}::${x.guru_id}` === key);
    if (!s) return;
    setMapelId(s.mata_pelajaran_id);
    setGuruId(s.guru_id);
    setJamList([...s.jam_list].sort((a: number, b: number) => a - b));
    setJamStatus(Object.fromEntries(s.jam_list.map((j: number) => [j, "M" as const])));
    setAutoFilled(true);
  };

  const toggleJam = (n: number) => {
    if (locked) return;
    setJamList((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].sort((a, b) => a - b)));
    setJamStatus((p) => {
      const next = { ...p };
      if (n in next) delete next[n];
      else next[n] = "M";
      return next;
    });
  };
  const setStatus = (n: number, s: "M" | "T+" | "T-") =>
    setJamStatus((p) => ({ ...p, [n]: s }));

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFotoDataUrl(String(reader.result));
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      setFotoExt(ext);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTanggal(today);
    setRombelId("");
    setMapelId("");
    setGuruId("");
    setJamList([]);
    setJamStatus({});
    setFotoDataUrl("");
    setFotoExt("");
    sigRef.current?.clear();
  };

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!rombelId) throw new Error("Pilih rombel murid");
      if (!mapelId) throw new Error("Pilih mata pelajaran");
      if (!guruId) throw new Error("Pilih nama guru pengajar");
      if (jamList.length === 0) throw new Error("Pilih minimal 1 jam pelajaran");
      if (sigRef.current?.isEmpty()) throw new Error("Tanda tangan pelapor wajib diisi");
      if (!fotoDataUrl) throw new Error("Foto kegiatan wajib diunggah");

      const ttdData = sigRef.current!.toDataURL();
      const [ttdRes, fotoRes] = await Promise.all([
        uploadFn({ data: { kind: "ttd", dataUrl: ttdData, ext: "png" } }),
        uploadFn({ data: { kind: "foto", dataUrl: fotoDataUrl, ext: fotoExt || "jpg" } }),
      ]);

      return createFn({
        data: {
          tanggal,
          rombel_id: rombelId,
          mata_pelajaran_id: mapelId,
          guru_id: guruId,
          jam_list: jamList,
          jam_status: Object.fromEntries(jamList.map((j) => [String(j), jamStatus[j] ?? "M"])),
          ttd_path: ttdRes.path,
          foto_path: fotoRes.path,
        },
      });
    },
    onSuccess: () => {
      toast.success("Laporan KBM berhasil disimpan");
      qc.invalidateQueries({ queryKey: ["lapor-kbm-list"] });
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tanggalDisplay = useMemo(() => {
    try {
      return new Date(tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return tanggal;
    }
  }, [tanggal]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Lapor KBM
        </h1>
        <p className="text-sm text-muted-foreground">Lapor data Kegiatan Belajar Mengajar harian</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Lapor KBM</CardTitle>
          <CardDescription>Lengkapi data kegiatan belajar mengajar</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitMut.mutate();
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Tanggal" required>
                <div className="relative">
                  <Input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">{tanggalDisplay}</p>
                </div>
              </Field>

              <Field label="Rombel Murid" required>
                <Select
                  value={rombelId}
                  onValueChange={(v) => {
                    setRombelId(v);
                    setMapelId("");
                    setGuruId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Cari dan pilih rombel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rombelList.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Sesi Terjadwal">
                <Select
                  value={
                    mapelId && guruId ? `${mapelId}::${guruId}` : ""
                  }
                  onValueChange={applySession}
                  disabled={!rombelId || !tanggal}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !rombelId || !tanggal
                          ? "Pilih tanggal & rombel dahulu"
                          : jadwalQ.isLoading
                            ? "Memuat jadwal..."
                            : (jadwalQ.data?.sessions ?? []).length === 0
                              ? `Tidak ada jadwal ${jadwalQ.data?.hari ?? ""}`
                              : `Pilih sesi (${jadwalQ.data?.hari ?? ""})`
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(jadwalQ.data?.sessions ?? []).map((s: any) => (
                      <SelectItem
                        key={`${s.mata_pelajaran_id}::${s.guru_id}`}
                        value={`${s.mata_pelajaran_id}::${s.guru_id}`}
                      >
                        Jam {s.jam_list.join(",")} — {s.mapel_nama} · {s.guru_nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Memilih sesi akan otomatis mengisi Mata Pelajaran, Guru, dan Jam Pelajaran.
                </p>
              </Field>



              <Field label="Mata Pelajaran" required>
                <Select
                  value={mapelId}
                  onValueChange={(v) => {
                    setMapelId(v);
                    setGuruId("");
                  }}
                  disabled={!rombelId}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !rombelId
                          ? "Pilih rombel terlebih dahulu"
                          : mapelQ.isLoading
                            ? "Memuat..."
                            : (mapelQ.data ?? []).length === 0
                              ? "Tidak ada mata pelajaran"
                              : "Pilih mata pelajaran"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(mapelQ.data ?? []).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Nama Guru Pengajar" required>
                <Select value={guruId} onValueChange={setGuruId} disabled={!mapelId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !mapelId
                          ? "Pilih mata pelajaran terlebih dahulu"
                          : guruQ.isLoading
                            ? "Memuat..."
                            : (guruQ.data ?? []).length === 0
                              ? "Tidak ada guru"
                              : "Pilih guru pengajar"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(guruQ.data ?? []).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Jam Pelajaran <span className="text-destructive">*</span>
                <span className="text-xs text-muted-foreground font-normal">(Pilih satu atau lebih)</span>
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {HOURS.map((n) => {
                  const active = jamList.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleJam(n)}
                      className={cn(
                        "px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background hover:bg-muted border-input",
                      )}
                    >
                      Jam {n}
                    </button>
                  );
                })}
              </div>

              {jamList.length > 0 && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="text-sm font-medium">Keterangan Kehadiran Guru per Jam:</div>
                  <div className="space-y-2">
                    {jamList.map((n) => {
                      const cur = jamStatus[n] ?? "M";
                      const opts: Array<{ v: "M" | "T+" | "T-"; label: string; active: string }> = [
                        { v: "M", label: "M", active: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600" },
                        { v: "T+", label: "T+", active: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600" },
                        { v: "T-", label: "T-", active: "bg-red-500 text-white border-red-500 hover:bg-red-600" },
                      ];
                      const desc = cur === "M" ? "(Masuk)" : cur === "T+" ? "(Tidak Masuk + Tugas)" : "(Tidak Masuk Tanpa Tugas)";
                      return (
                        <div key={n} className="flex items-center gap-3 text-sm">
                          <span className="w-14 shrink-0 text-muted-foreground">Jam {n}:</span>
                          <div className="flex gap-1">
                            {opts.map((o) => (
                              <button
                                key={o.v}
                                type="button"
                                onClick={() => setStatus(n, o.v)}
                                className={cn(
                                  "h-8 min-w-9 px-2 rounded-md border text-xs font-semibold transition-colors",
                                  cur === o.v ? o.active : "bg-background text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{desc}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" /> M = Masuk
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-amber-500" /> T+ = Tidak Masuk + Tugas
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-sm bg-red-500" /> T- = Tidak Masuk Tanpa Tugas
                    </span>
                  </div>
                </div>
              )}
            </div>


            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  TTD Pelapor <span className="text-destructive">*</span>
                </Label>
                <SignaturePad ref={sigRef} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Gambar tanda tangan di area di atas
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => sigRef.current?.clear()}
                  >
                    <Eraser className="h-3.5 w-3.5 mr-1" />
                    Hapus Tanda Tangan
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Foto Kegiatan <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileCam.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Ambil Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileGal.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Pilih dari Galeri
                  </Button>
                </div>
                <input
                  ref={fileCam}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={fileGal}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                {fotoDataUrl ? (
                  <div className="relative mt-2 border rounded-lg overflow-hidden">
                    <img src={fotoDataUrl} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFotoDataUrl("");
                        setFotoExt("");
                      }}
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Belum ada foto. Maksimal 5 MB.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={submitMut.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {submitMut.isPending ? "Menyimpan..." : "Simpan Data KBM"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
