import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  listJadwal, jadwalOptions, clearJadwal,
  bulkCreateJadwal, bulkUpdateJadwal, bulkDeleteJadwal,
  listAlokasiWaktu, upsertAlokasiWaktu,
} from "@/lib/jadwal.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Eraser, Plus, Pencil, Trash2, X, CheckCircle2, Circle, Check, ChevronsUpDown, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ComboOption = { value: string; label: string; hint?: string };
function Combobox({
  options, value, onChange, placeholder = "Pilih...", searchPlaceholder = "Cari...", emptyText = "Tidak ditemukan",
}: {
  options: ComboOption[]; value: string; onChange: (v: string) => void;
  placeholder?: string; searchPlaceholder?: string; emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          <span className="truncate">{selected ? selected.label + (selected.hint ? ` ${selected.hint}` : "") : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}{o.hint ? <span className="text-muted-foreground"> {o.hint}</span> : null}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] as const;
type Hari = (typeof HARI)[number];
const JAM_PER_HARI = 9;

type SlotKey = string; // `${hari}#${jam}`
const slotKey = (h: string, j: number): SlotKey => `${h}#${j}`;

export const Route = createFileRoute("/_authenticated/jadwal")({
  ssr: false,
  head: () => ({ meta: [{ title: "Jadwal Pelajaran — SUPREME XPOES" }] }),
  loader: async () => {
    const opts = await jadwalOptions();
    return { opts };
  },
  component: JadwalPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error?.message ?? String(error)}</div>,
});




function JadwalPage() {
  const { opts } = Route.useLoaderData();
  const [target, setTarget] = useState<"rombel" | "kelompok">("rombel");
  const [filterRombel, setFilterRombel] = useState<string>(opts.rombel[0]?.id ?? "");
  const [filterKelompok, setFilterKelompok] = useState<string>(opts.kelompok?.[0]?.id ?? "");
  const [filterGuru, setFilterGuru] = useState<string>("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listJadwal);

  const activeTargetId = target === "rombel" ? filterRombel : filterKelompok;

  // selection: either empty slots or filled ids — never mixed
  const [selEmpty, setSelEmpty] = useState<Set<SlotKey>>(new Set());
  const [selFilled, setSelFilled] = useState<Set<string>>(new Set());
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const { data } = useSuspenseQuery({
    queryKey: ["jadwal", target, activeTargetId, filterGuru],
    queryFn: () => fetchList({
      data: {
        rombelId: target === "rombel" ? (filterRombel || undefined) : undefined,
        kelompokId: target === "kelompok" ? (filterKelompok || undefined) : undefined,
        guruId: filterGuru === "all" ? undefined : filterGuru,
      },
    }),
  });

  const clearSel = () => { setSelEmpty(new Set()); setSelFilled(new Set()); };
  const invalidate = () => qc.invalidateQueries({ queryKey: ["jadwal"] });

  const grid = useMemo(() => {
    const maxJam = Math.max(JAM_PER_HARI, ...data.map((d) => Number(d.jam_ke ?? 0)));
    const cells: Record<string, Record<number, any[]>> = {};
    for (const h of HARI) cells[h] = {};
    for (const r of data) {
      const h = r.hari as string;
      const j = Number(r.jam_ke ?? 0);
      if (!HARI.includes(h as any)) continue;
      cells[h][j] = cells[h][j] || [];
      cells[h][j].push(r);
    }
    return { cells, maxJam };
  }, [data]);

  const alokasiMap = useMemo(() => {
    const m = new Map<SlotKey, { jam_mulai?: string; jam_selesai?: string }>();
    for (const a of opts.alokasi ?? [])
      m.set(slotKey(String(a.hari ?? ""), Number(a.jam_ke)), {
        jam_mulai: a.jam_mulai ?? undefined,
        jam_selesai: a.jam_selesai ?? undefined,
      });
    return m;
  }, [opts.alokasi]);

  const toggleEmpty = (h: Hari, j: number) => {
    if (selFilled.size > 0) return; // guard
    const k = slotKey(h, j);
    setSelEmpty((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };
  const toggleFilled = (id: string) => {
    if (selEmpty.size > 0) return;
    setSelFilled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectedFilledRows = useMemo(
    () => data.filter((r) => selFilled.has(r.id)),
    [data, selFilled],
  );

  const bulkDelFn = useServerFn(bulkDeleteJadwal);
  const bulkDel = useMutation({
    mutationFn: () => bulkDelFn({ data: { ids: Array.from(selFilled) } }),
    onSuccess: (r: any) => { toast.success(`${r.deleted ?? 0} slot dihapus`); clearSel(); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const rombelName = opts.rombel.find((r: any) => r.id === filterRombel)?.name;
  const kelompokName = opts.kelompok?.find((k: any) => k.id === filterKelompok)?.nama;
  const activeTargetName = target === "rombel" ? rombelName : kelompokName;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Klik slot untuk memilih. Bisa satuan atau banyak sekaligus.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AlokasiWaktuDialog />
          <SalinJadwalDialog
            target={target}
            rombelId={filterRombel}
            kelompokId={filterKelompok}
            targetName={activeTargetName ?? undefined}
            rombelList={opts.rombel ?? []}
            kelompokList={opts.kelompok ?? []}
            onDone={invalidate}
          />
          <ClearJadwalDialog
            target={target}
            rombelId={filterRombel}
            kelompokId={filterKelompok}
            guruId={filterGuru === "all" ? undefined : filterGuru}
            targetName={activeTargetName ?? undefined}
            onDone={invalidate}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={target} onValueChange={(v) => { clearSel(); setTarget(v as any); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rombel">Rombel</SelectItem>
                  <SelectItem value="kelompok">Kelompok Belajar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {target === "rombel" ? (
              <div className="space-y-2">
                <Label>Rombel</Label>
                <Select value={filterRombel} onValueChange={(v) => { clearSel(); setFilterRombel(v); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                  <SelectContent>
                    {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Kelompok Belajar</Label>
                <Select value={filterKelompok} onValueChange={(v) => { clearSel(); setFilterKelompok(v); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelompok" /></SelectTrigger>
                  <SelectContent>
                    {(opts.kelompok ?? []).map((k: any) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={filterGuru} onValueChange={(v) => { clearSel(); setFilterGuru(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua guru</SelectItem>
                  {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
          <CardTitle className="text-base">
            Jadwal {activeTargetName ? `— ${activeTargetName}` : ""}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {selEmpty.size > 0 && (
              <>
                <Badge variant="secondary" className="rounded-full">{selEmpty.size} slot kosong dipilih</Badge>
                <Button variant="outline" size="sm" onClick={clearSel}><X className="h-4 w-4 mr-1" /> Batal</Button>
                <Button size="sm" onClick={() => setOpenAdd(true)} disabled={!activeTargetId}>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Mapel
                </Button>
              </>
            )}
            {selFilled.size > 0 && (
              <>
                <Badge className="rounded-full">{selFilled.size} jadwal dipilih</Badge>
                <Button variant="outline" size="sm" onClick={clearSel}><X className="h-4 w-4 mr-1" /> Batal</Button>
                <Button variant="outline" size="sm" onClick={() => setOpenEdit(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="destructive" size="sm"
                  onClick={() => { if (confirm(`Hapus ${selFilled.size} jadwal?`)) bulkDel.mutate(); }}
                  disabled={bulkDel.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Hapus
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left w-24">Hari</th>
                {Array.from({ length: grid.maxJam }, (_, i) => i + 1).map((jam) => (
                  <th key={jam} className="border p-2 text-left">Jam {jam}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HARI.map((h) => (
                <tr key={h}>
                  <td className="border p-2 font-medium align-top bg-muted/30">{h}</td>
                  {Array.from({ length: grid.maxJam }, (_, i) => i + 1).map((jam) => {
                    const rows = grid.cells[h][jam] ?? [];
                    const isEmpty = rows.length === 0;
                    const k = slotKey(h, jam);
                    const emptySelected = selEmpty.has(k);
                    const disableEmpty = selFilled.size > 0 || !activeTargetId;
                    if (isEmpty) {
                      return (
                        <td key={jam} className="border p-1 align-top min-w-[170px]">
                          <button
                            type="button"
                            onClick={() => toggleEmpty(h, jam)}
                            disabled={disableEmpty}
                            className={cn(
                              "w-full min-h-[58px] rounded-md border-2 border-dashed flex items-center justify-center transition-colors",
                              emptySelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent hover:border-muted-foreground/30 hover:bg-muted/40",
                              disableEmpty && "opacity-50 cursor-not-allowed hover:border-transparent hover:bg-transparent",
                            )}
                            aria-pressed={emptySelected}
                          >
                            {emptySelected
                              ? <CheckCircle2 className="h-5 w-5" />
                              : <Circle className="h-5 w-5 text-muted-foreground/40" />}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={jam} className="border p-1 align-top min-w-[170px]">
                        {rows.map((s: any) => {
                          const selected = selFilled.has(s.id);
                          const disable = selEmpty.size > 0;
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => toggleFilled(s.id)}
                              disabled={disable}
                              className={cn(
                                "w-full text-left mb-1 last:mb-0 rounded-md border p-2 text-xs transition-colors flex gap-2 items-start",
                                selected
                                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                                  : "bg-card hover:bg-muted/40",
                                disable && "opacity-50 cursor-not-allowed",
                              )}
                              aria-pressed={selected}
                            >
                              <span className="mt-0.5 shrink-0">
                                {selected
                                  ? <CheckCircle2 className="h-4 w-4 text-primary" />
                                  : <Circle className="h-4 w-4 text-muted-foreground/50" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium leading-tight truncate">{s.mapel_nama}</span>
                                <span className="block text-muted-foreground leading-tight truncate">{s.guru_nama}</span>
                                {filterGuru !== "all" || !activeTargetId ? (
                                  <span className="block text-muted-foreground leading-tight truncate">{s.rombel_name}</span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <BulkAddDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        opts={opts}
        target={target}
        rombelId={filterRombel}
        kelompokId={filterKelompok}
        slots={Array.from(selEmpty).map((k) => {
          const [h, j] = k.split("#");
          const a = alokasiMap.get(k);
          return { hari: h as Hari, jamKe: Number(j), jamMulai: a?.jam_mulai, jamSelesai: a?.jam_selesai };
        })}
        onDone={() => { clearSel(); invalidate(); }}
      />
      <BulkEditDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        opts={opts}
        rows={selectedFilledRows}
        onDone={() => { clearSel(); invalidate(); }}
      />
    </div>
  );
}

function slotLabel(hari: string, jam: number) {
  return `${hari} Jam ${jam}`;
}

function BulkAddDialog({
  open, onOpenChange, opts, target, rombelId, kelompokId, slots, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; opts: any;
  target: "rombel" | "kelompok"; rombelId: string; kelompokId: string;
  slots: { hari: Hari; jamKe: number; jamMulai?: string; jamSelesai?: string }[];
  onDone: () => void;
}) {
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const createFn = useServerFn(bulkCreateJadwal);
  const mut = useMutation({
    mutationFn: () => createFn({ data: {
      rombelId: target === "rombel" ? rombelId : undefined,
      kelompokId: target === "kelompok" ? kelompokId : undefined,
      mataPelajaranId: mapelId, guruId, slots,
    } }),
    onSuccess: (r: any) => { toast.success(`${r.inserted ?? 0} slot ditambahkan`); setMapelId(""); setGuruId(""); onOpenChange(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  const submit = () => {
    if (!mapelId || !guruId) return toast.error("Pilih mapel & guru");
    mut.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Mata Pelajaran</DialogTitle>
          <DialogDescription>Tambahkan mata pelajaran ke {slots.length} slot yang dipilih</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs font-medium mb-2">Slot yang dipilih:</div>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => (
                <Badge key={`${s.hari}${s.jamKe}`} variant="secondary" className="rounded-full">
                  {slotLabel(s.hari, s.jamKe)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Mata Pelajaran <span className="text-destructive">*</span></Label>
            <Combobox
              value={mapelId}
              onChange={setMapelId}
              placeholder="Pilih mata pelajaran..."
              searchPlaceholder="Cari mata pelajaran..."
              options={opts.mapel.map((m: any) => ({ value: m.id, label: m.nama, hint: m.kode ? `(${m.kode})` : undefined }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Guru <span className="text-destructive">*</span></Label>
            <Combobox
              value={guruId}
              onChange={setGuruId}
              placeholder="Pilih guru..."
              searchPlaceholder="Cari guru..."
              options={opts.guru.map((g: any) => ({ value: g.id, label: g.nama }))}
            />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? "Menyimpan..." : `Tambah ke ${slots.length} Slot`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkEditDialog({
  open, onOpenChange, opts, rows, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; opts: any;
  rows: any[]; onDone: () => void;
}) {
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const updFn = useServerFn(bulkUpdateJadwal);
  const mut = useMutation({
    mutationFn: () => updFn({ data: { ids: rows.map((r) => r.id), mataPelajaranId: mapelId, guruId } }),
    onSuccess: (r: any) => { toast.success(`${r.updated ?? 0} jadwal diperbarui`); setMapelId(""); setGuruId(""); onOpenChange(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });
  const submit = () => {
    if (!mapelId || !guruId) return toast.error("Pilih mapel & guru");
    mut.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {rows.length} Jadwal</DialogTitle>
          <DialogDescription>Ubah mata pelajaran dan guru untuk semua jadwal yang dipilih</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="text-xs font-medium mb-2">Jadwal yang dipilih:</div>
            <div className="flex flex-wrap gap-1.5">
              {rows.map((r) => (
                <Badge key={r.id} variant="secondary" className="rounded-full">
                  {slotLabel(r.hari, Number(r.jam_ke))}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Mata Pelajaran Baru <span className="text-destructive">*</span></Label>
            <Combobox
              value={mapelId}
              onChange={setMapelId}
              placeholder="Pilih mata pelajaran..."
              searchPlaceholder="Cari mata pelajaran..."
              options={opts.mapel.map((m: any) => ({ value: m.id, label: m.nama, hint: m.kode ? `(${m.kode})` : undefined }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Guru Baru <span className="text-destructive">*</span></Label>
            <Combobox
              value={guruId}
              onChange={setGuruId}
              placeholder="Pilih guru..."
              searchPlaceholder="Cari guru..."
              options={opts.guru.map((g: any) => ({ value: g.id, label: g.nama }))}
            />
          </div>

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? "Menyimpan..." : `Edit ${rows.length} Jadwal`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClearJadwalDialog({
  target, rombelId, kelompokId, guruId, targetName, onDone,
}: { target: "rombel" | "kelompok"; rombelId: string; kelompokId: string; guruId?: string; targetName?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const clearFn = useServerFn(clearJadwal);

  const run = useMutation({
    mutationFn: () => clearFn({ data: {
      rombelId: target === "rombel" ? (rombelId || undefined) : undefined,
      kelompokId: target === "kelompok" ? (kelompokId || undefined) : undefined,
      guruId, scope,
    } }),
    onSuccess: (r: any) => { toast.success(`${r.deleted ?? 0} slot dihapus`); setOpen(false); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Eraser className="h-4 w-4 mr-1" /> Hapus Semua Jadwal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Jadwal</DialogTitle>
          <DialogDescription>Pilih cakupan penghapusan. Tindakan ini tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input type="radio" name="scope" checked={scope === "filtered"} onChange={() => setScope("filtered")} className="mt-1" />
            <div>
              <div className="font-medium">Hanya sesuai filter aktif</div>
              <div className="text-xs text-muted-foreground">
                {target === "rombel" ? "Rombel" : "Kelompok"}: {targetName ?? "—"}{guruId ? " • Guru dipilih" : ""}
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} className="mt-1" />
            <div>
              <div className="font-medium text-destructive">Semua jadwal (seluruh rombel & guru)</div>
              <div className="text-xs text-muted-foreground">Menghapus SEMUA slot jadwal pada database.</div>
            </div>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button variant="destructive" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Menghapus..." : "Hapus"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ALOKASI_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"] as const;
const ALOKASI_JAM = Array.from({ length: 9 }, (_, i) => i + 1);

function fmtHM(v?: string) {
  if (!v) return "";
  return v.length >= 5 ? v.slice(0, 5) : v;
}

function AlokasiWaktuDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();
  const listFn = useServerFn(listAlokasiWaktu);
  const saveFn = useServerFn(upsertAlokasiWaktu);

  type Cell = { jam_mulai: string; jam_selesai: string };
  const [grid, setGrid] = useState<Record<string, Cell>>({});

  const load = async () => {
    const rows: any[] = await listFn();
    const g: Record<string, Cell> = {};
    for (const h of ALOKASI_HARI) for (const j of ALOKASI_JAM) g[`${h}#${j}`] = { jam_mulai: "", jam_selesai: "" };
    for (const r of rows) {
      const key = `${r.hari}#${r.jam_ke}`;
      if (key in g) g[key] = { jam_mulai: fmtHM(r.jam_mulai), jam_selesai: fmtHM(r.jam_selesai) };
    }
    setGrid(g);
  };

  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

  const setCell = (h: string, j: number, patch: Partial<Cell>) => {
    setGrid((s) => ({ ...s, [`${h}#${j}`]: { ...s[`${h}#${j}`], ...patch } }));
  };

  const copyDown = (j: number) => {
    const src = grid[`${ALOKASI_HARI[0]}#${j}`];
    if (!src?.jam_mulai && !src?.jam_selesai) return;
    setGrid((s) => {
      const n = { ...s };
      for (const h of ALOKASI_HARI) n[`${h}#${j}`] = { ...src };
      return n;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      const rows: any[] = [];
      for (const h of ALOKASI_HARI) for (const j of ALOKASI_JAM) {
        const c = grid[`${h}#${j}`];
        if (c?.jam_mulai && c?.jam_selesai) {
          rows.push({ hari: h, jamKe: j, jamMulai: c.jam_mulai, jamSelesai: c.jam_selesai });
        }
      }
      if (!rows.length) throw new Error("Belum ada waktu yang diisi");
      return saveFn({ data: { rows } });
    },
    onSuccess: (r: any) => {
      toast.success(`${r.count ?? 0} alokasi tersimpan`);
      setOpen(false);
      qc.invalidateQueries();
      router.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Clock className="h-4 w-4 mr-1" /> Alokasi Waktu</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alokasi Waktu Jam Pelajaran</DialogTitle>
          <DialogDescription>
            Atur jam mulai & jam selesai untuk jam 1–9 Senin–Jumat. Nilai ini menjadi acuan pada Jadwal Pelajaran dan Agenda Guru.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border p-2 text-left sticky left-0 bg-muted/50 z-10">Hari</th>
                {ALOKASI_JAM.map((j) => (
                  <th key={j} className="border p-2 text-center min-w-[140px]">
                    <div className="font-semibold">Jam {j}</div>
                    <button type="button" onClick={() => copyDown(j)} className="text-[10px] text-primary hover:underline mt-0.5">
                      salin ke bawah
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALOKASI_HARI.map((h) => (
                <tr key={h}>
                  <td className="border p-2 font-medium bg-muted/30 sticky left-0 z-10">{h}</td>
                  {ALOKASI_JAM.map((j) => {
                    const c = grid[`${h}#${j}`] ?? { jam_mulai: "", jam_selesai: "" };
                    return (
                      <td key={j} className="border p-1 align-top">
                        <div className="flex flex-col gap-1">
                          <Input type="time" value={c.jam_mulai} onChange={(e) => setCell(h, j, { jam_mulai: e.target.value })} className="h-8 text-xs" />
                          <Input type="time" value={c.jam_selesai} onChange={(e) => setCell(h, j, { jam_selesai: e.target.value })} className="h-8 text-xs" />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
