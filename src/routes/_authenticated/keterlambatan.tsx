import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { listRombelAll as listRombel } from "@/lib/presensi.functions";
import {
  createKeterlambatan,
  listStudentsByRombel,
} from "@/lib/keterlambatan.functions";
import { Clock, GraduationCap, UserRound, ChevronsUpDown, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/keterlambatan")({
  head: () => ({ meta: [{ title: "Input Keterlambatan — SUPREME XPOES" }] }),
  loader: async () => ({ rombel: await listRombel() }),
  component: KeterlambatanPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function useNow() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function KeterlambatanPage() {
  const { rombel } = Route.useLoaderData();
  const now = useNow();

  const today = new Date().toISOString().slice(0, 10);
  const [rombelId, setRombelId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rombelOpen, setRombelOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);

  const fetchStudents = useServerFn(listStudentsByRombel);
  const createFn = useServerFn(createKeterlambatan);

  const { data: students = [] } = useQuery({
    queryKey: ["late-students-by-rombel", rombelId],
    queryFn: () => fetchStudents({ data: { rombelId } }),
    enabled: !!rombelId,
  });

  const selectedRombel = rombel.find((r: any) => r.id === rombelId);
  const selectedStudent = (students as any[]).find((s) => s.id === studentId);

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          studentId,
          rombelId,
          recordDate: today,
          recordedAt: new Date().toISOString(),
        },
      }),
    onSuccess: () => {
      toast.success("Data keterlambatan tersimpan");
      setStudentId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const hari = HARI[now.getDay()];
  const tanggal = `${hari}, ${now.getDate()} ${BULAN[now.getMonth()]} ${now.getFullYear()}`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const jam = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 py-2">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Input Keterlambatan</h1>
        <p className="text-sm text-muted-foreground">
          Catat murid yang terlambat datang ke sekolah
        </p>
      </div>

      {/* Clock card */}
      <div className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5 text-white shadow-lg">
        <div className="flex items-center justify-center gap-4">
          <Clock className="h-10 w-10 shrink-0" strokeWidth={2} />
          <div className="text-center">
            <div className="text-sm/tight opacity-95">{tanggal}</div>
            <div className="text-3xl font-bold tracking-tight tabular-nums">
              {jam} <span className="text-xl font-semibold">WIB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-muted-foreground" />
            Form Input Keterlambatan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Rombel */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              Pilih Rombel
            </Label>
            <Popover open={rombelOpen} onOpenChange={setRombelOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={rombelOpen}
                  className="w-full justify-between font-normal bg-muted/40 hover:bg-muted/60"
                >
                  {selectedRombel ? (
                    <span>{selectedRombel.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Cari dan pilih rombel…</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                style={{ width: "var(--radix-popover-trigger-width)" }}
              >
                <Command>
                  <CommandInput placeholder="Cari rombel…" />
                  <CommandList>
                    <CommandEmpty>Rombel tidak ditemukan</CommandEmpty>
                    <CommandGroup>
                      {rombel.map((r: any) => (
                        <CommandItem
                          key={r.id}
                          value={r.name}
                          onSelect={() => {
                            setRombelId(r.id);
                            setStudentId("");
                            setRombelOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              rombelId === r.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {r.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Student */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Pilih Murid
            </Label>
            <Popover open={studentOpen} onOpenChange={setStudentOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentOpen}
                  disabled={!rombelId}
                  className="w-full justify-between font-normal bg-muted/40 hover:bg-muted/60 disabled:opacity-70"
                >
                  {selectedStudent ? (
                    <span className="truncate">
                      {selectedStudent.name}
                      {selectedStudent.nis ? (
                        <span className="text-muted-foreground"> · NIS: {selectedStudent.nis}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {rombelId ? "Cari dan pilih murid…" : "Pilih rombel terlebih dahulu"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                style={{ width: "var(--radix-popover-trigger-width)" }}
              >
                <Command>
                  <CommandInput placeholder="Cari nama atau NIS…" />
                  <CommandList>
                    <CommandEmpty>Murid tidak ditemukan</CommandEmpty>
                    <CommandGroup>
                      {(students as any[]).map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.name} ${s.nis ?? ""}`}
                          onSelect={() => {
                            setStudentId(s.id);
                            setStudentOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              studentId === s.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{s.name}</span>
                            {s.nis && (
                              <span className="text-xs text-muted-foreground">
                                NIS: {s.nis}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-base font-medium"
            disabled={!rombelId || !studentId || create.isPending}
            onClick={() => create.mutate()}
          >
            <Save className="h-4 w-4 mr-2" />
            {create.isPending ? "Menyimpan…" : "Simpan Data Keterlambatan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
