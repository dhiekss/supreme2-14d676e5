import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  listJadwal, jadwalOptions, clearJadwal,
  bulkCreateJadwal, bulkUpdateJadwal, bulkDeleteJadwal,
} from "@/lib/jadwal.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Eraser, Plus, Pencil, Trash2, X, CheckCircle2, Circle, Check, ChevronsUpDown } from "lucide-react";
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


const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
type Hari = (typeof HARI)[number];

type SlotKey = string; // `${hari}#${jam}`
const slotKey = (h: string, j: number): SlotKey => `${h}#${j}`;

export const Route = createFileRoute("/_authenticated/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal Pelajaran — SUPREME XPOES" }] }),
  loader: async () => ({ opts: await jadwalOptions() }),
  component: JadwalPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function JadwalPage() {
  const { opts } = Route.useLoaderData();
  const [filterRombel, setFilterRombel] = useState<string>(opts.rombel[0]?.id ?? "");
  const [filterGuru, setFilterGuru] = useState<string>("all");
  const qc = useQueryClient();
  const fetchList = useServerFn(listJadwal);

  // selection: either empty slots or filled ids — never mixed
  const [selEmpty, setSelEmpty] = useState<Set<SlotKey>>(new Set());
  const [selFilled, setSelFilled] = useState<Set<string>>(new Set());
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const { data } = useSuspenseQuery({
    queryKey: ["jadwal", filterRombel, filterGuru],
    queryFn: () => fetchList({
      data: {
        rombelId: filterRombel || undefined,
        guruId: filterGuru === "all" ? undefined : filterGuru,
      },
    }),
  });

  const clearSel = () => { setSelEmpty(new Set()); setSelFilled(new Set()); };
  const invalidate = () => qc.invalidateQueries({ queryKey: ["jadwal"] });

  const grid = useMemo(() => {
    const maxJam = Math.max(8, ...data.map((d) => Number(d.jam_ke ?? 0)));
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
    for (const a of opts.alokasi ?? []) m.set(slotKey(a.hari, Number(a.jam_ke)), a);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Klik slot untuk memilih. Bisa satuan atau banyak sekaligus.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ClearJadwalDialog
            rombelId={filterRombel}
            guruId={filterGuru === "all" ? undefined : filterGuru}
            rombelName={rombelName}
            onDone={invalidate}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Rombel</Label>
              <Select value={filterRombel} onValueChange={(v) => { clearSel(); setFilterRombel(v); }}>
                <SelectTrigger><SelectValue placeholder="Pilih rombel" /></SelectTrigger>
                <SelectContent>
                  {opts.rombel.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            Jadwal {rombelName ? `— ${rombelName}` : ""}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {selEmpty.size > 0 && (
              <>
                <Badge variant="secondary" className="rounded-full">{selEmpty.size} slot kosong dipilih</Badge>
                <Button variant="outline" size="sm" onClick={clearSel}><X className="h-4 w-4 mr-1" /> Batal</Button>
                <Button size="sm" onClick={() => setOpenAdd(true)} disabled={!filterRombel}>
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
                <th className="border p-2 text-left w-20">Jam</th>
                {HARI.map((h) => <th key={h} className="border p-2 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: grid.maxJam }, (_, i) => i + 1).map((jam) => (
                <tr key={jam}>
                  <td className="border p-2 font-medium align-top bg-muted/30">Jam {jam}</td>
                  {HARI.map((h) => {
                    const rows = grid.cells[h][jam] ?? [];
                    const isEmpty = rows.length === 0;
                    const k = slotKey(h, jam);
                    const emptySelected = selEmpty.has(k);
                    const disableEmpty = selFilled.size > 0 || !filterRombel;
                    if (isEmpty) {
                      return (
                        <td key={h} className="border p-1 align-top min-w-[170px]">
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
                      <td key={h} className="border p-1 align-top min-w-[170px]">
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
                                {filterGuru !== "all" || !filterRombel ? (
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
        rombelId={filterRombel}
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
  open, onOpenChange, opts, rombelId, slots, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; opts: any; rombelId: string;
  slots: { hari: Hari; jamKe: number; jamMulai?: string; jamSelesai?: string }[];
  onDone: () => void;
}) {
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const createFn = useServerFn(bulkCreateJadwal);
  const mut = useMutation({
    mutationFn: () => createFn({ data: { rombelId, mataPelajaranId: mapelId, guruId, slots } }),
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
            <Select value={mapelId} onValueChange={setMapelId}>
              <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran..." /></SelectTrigger>
              <SelectContent>
                {opts.mapel.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Guru <span className="text-destructive">*</span></Label>
            <Select value={guruId} onValueChange={setGuruId}>
              <SelectTrigger><SelectValue placeholder="Pilih guru..." /></SelectTrigger>
              <SelectContent>
                {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Select value={mapelId} onValueChange={setMapelId}>
              <SelectTrigger><SelectValue placeholder="Pilih mata pelajaran..." /></SelectTrigger>
              <SelectContent>
                {opts.mapel.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nama}{m.kode ? ` (${m.kode})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Guru Baru <span className="text-destructive">*</span></Label>
            <Select value={guruId} onValueChange={setGuruId}>
              <SelectTrigger><SelectValue placeholder="Pilih guru..." /></SelectTrigger>
              <SelectContent>
                {opts.guru.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.nama}</SelectItem>)}
              </SelectContent>
            </Select>
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
  rombelId, guruId, rombelName, onDone,
}: { rombelId: string; guruId?: string; rombelName?: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"filtered" | "all">("filtered");
  const clearFn = useServerFn(clearJadwal);

  const run = useMutation({
    mutationFn: () => clearFn({ data: { rombelId: rombelId || undefined, guruId, scope } }),
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
                Rombel: {rombelName ?? "—"}{guruId ? " • Guru dipilih" : ""}
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
