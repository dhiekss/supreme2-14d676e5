import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserSearch, CalendarDays, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  listGuruForAgenda,
  listJadwalAgenda,
  upsertAgendaGuru,
} from "@/lib/agenda-guru.functions";

export const Route = createFileRoute("/_authenticated/pembelajaran/agenda-guru")({
  head: () => ({ meta: [{ title: "Agenda Guru — SUPREME XPOES" }] }),
  component: AgendaGuruPage,
  errorComponent: ({ error }) => (
    <div className="text-destructive p-6">Gagal: {error.message}</div>
  ),
});

const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatTanggal(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${HARI_ID[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function AgendaGuruPage() {
  const fetchGuru = useServerFn(listGuruForAgenda);
  const guruQ = useQuery({ queryKey: ["agenda-guru-list"], queryFn: () => fetchGuru() });

  const [guruId, setGuruId] = useState<string>("");
  const [tanggal, setTanggal] = useState<string>(todayIso());

  useEffect(() => {
    if (!guruId && guruQ.data?.rows?.length) {
      setGuruId(guruQ.data.rows[0].id);
    }
  }, [guruQ.data, guruId]);

  const fetchJadwal = useServerFn(listJadwalAgenda);
  const jadwalQ = useQuery({
    queryKey: ["agenda-jadwal", guruId, tanggal],
    queryFn: () => fetchJadwal({ data: { guruId, tanggal } }),
    enabled: !!guruId && !!tanggal,
  });

  const selectedGuru = useMemo(
    () => guruQ.data?.rows?.find((g: any) => g.id === guruId),
    [guruQ.data, guruId],
  );

  const [openSlot, setOpenSlot] = useState<any>(null);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda Guru</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Isi agenda mengajar harian sesuai jadwal.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <UserSearch className="h-4 w-4 text-muted-foreground" /> Pilih Guru
              </Label>
              <Select value={guruId} onValueChange={setGuruId}>
                <SelectTrigger className="h-11 bg-muted/30 border-0">
                  <SelectValue placeholder="Pilih guru" />
                </SelectTrigger>
                <SelectContent>
                  {(guruQ.data?.rows ?? []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nama}{g.nip ? ` (${g.nip})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> Tanggal Pengisian
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="h-11 bg-muted/30 border-0 pl-10"
                />
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
              <p className="text-sm text-muted-foreground mt-1">
                Guru ini tidak memiliki jadwal mengajar pada hari ini.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jadwalQ.data.map((slot: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl border p-4 flex flex-col gap-3 bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Jam ke-{slot.jam_ke_start}
                      {slot.jam_ke_end !== slot.jam_ke_start ? ` – ${slot.jam_ke_end}` : ""}
                    </div>
                    {slot.sudah_diisi ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Sudah Diisi
                      </Badge>
                    ) : (
                      <Badge variant="outline">Belum Diisi</Badge>
                    )}
                  </div>
                  {(slot.jam_mulai || slot.jam_selesai) && (
                    <div className="text-sm text-muted-foreground">
                      {slot.jam_mulai ?? ""} – {slot.jam_selesai ?? ""}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Kelas</div>
                    <div className="font-medium">{slot.rombel_name}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Mata Pelajaran</div>
                    <div className="font-medium">{slot.mapel_nama}</div>
                  </div>
                  <Button
                    className="w-full mt-auto"
                    onClick={() => setOpenSlot(slot)}
                  >
                    {slot.sudah_diisi ? "Ubah Agenda" : "Isi Agenda"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AgendaDialog
        slot={openSlot}
        guruId={guruId}
        guruNama={selectedGuru?.nama ?? ""}
        tanggal={tanggal}
        onClose={() => setOpenSlot(null)}
      />
    </div>
  );
}

function AgendaDialog({
  slot,
  guruId,
  guruNama,
  tanggal,
  onClose,
}: {
  slot: any;
  guruId: string;
  guruNama: string;
  tanggal: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertAgendaGuru);
  const [materi, setMateri] = useState("");
  const [status, setStatus] = useState<"Hadir" | "Izin" | "Sakit" | "Dinas Luar">("Hadir");

  useEffect(() => {
    if (slot) {
      setMateri(slot.existing_materi ?? "");
      setStatus((slot.existing_status as any) ?? "Hadir");
    }
  }, [slot]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          guruId,
          tanggal,
          rombelId: slot.rombel_id,
          mataPelajaranId: slot.mata_pelajaran_id,
          jamList: slot.jam_list,
          materiDetail: materi,
          guruStatus: status,
        },
      }),
    onSuccess: () => {
      toast.success("Agenda tersimpan");
      qc.invalidateQueries({ queryKey: ["agenda-jadwal"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submit = () => {
    if (!materi.trim()) return toast.error("Materi/kegiatan wajib diisi");
    save.mutate();
  };

  return (
    <Dialog open={!!slot} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Isi Agenda Mengajar</DialogTitle>
          <DialogDescription>
            {guruNama} — {formatTanggal(tanggal)}
          </DialogDescription>
        </DialogHeader>
        {slot && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Jam ke-</div>
                <div className="font-semibold">
                  {slot.jam_ke_start}
                  {slot.jam_ke_end !== slot.jam_ke_start ? ` – ${slot.jam_ke_end}` : ""}
                </div>
                {(slot.jam_mulai || slot.jam_selesai) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {slot.jam_mulai ?? ""} – {slot.jam_selesai ?? ""}
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Kelas</div>
                <div className="font-semibold">{slot.rombel_name}</div>
                <div className="text-xs text-muted-foreground mt-1">{slot.mapel_nama}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status Guru</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hadir">Hadir</SelectItem>
                  <SelectItem value="Izin">Izin</SelectItem>
                  <SelectItem value="Sakit">Sakit</SelectItem>
                  <SelectItem value="Dinas Luar">Dinas Luar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Materi / Kegiatan Pembelajaran</Label>
              <Textarea
                rows={5}
                placeholder="Tuliskan materi atau kegiatan pembelajaran..."
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan Agenda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
