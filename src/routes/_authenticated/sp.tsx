import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getBpBkData } from "@/lib/bpbk.functions";
import { createSp, deleteSp } from "@/lib/sp.functions";
import {
  AlertTriangle,
  Users,
  Search,
  Trash2,
  FileText,
  Pencil,
  Eye,
  FilePlus2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sp")({
  head: () => ({ meta: [{ title: "Manajemen BP/BK — SUPREME XPOES" }] }),
  loader: async () => ({ data: await getBpBkData() }),
  component: BpBkPage,
  errorComponent: ({ error }) => (
    <div className="text-destructive">Gagal: {error.message}</div>
  ),
});

type StatCardTone = "sp1r" | "sp1m" | "sp2r" | "sp2m" | "sp3r" | "sp3m";

const statStyle: Record<StatCardTone, string> = {
  sp1r: "border-l-4 border-l-amber-500 text-amber-600 dark:text-amber-400",
  sp1m: "border-l-4 border-l-blue-500 text-blue-600 dark:text-blue-400",
  sp2r: "border-l-4 border-l-orange-500 text-orange-600 dark:text-orange-400",
  sp2m: "border-l-4 border-l-purple-500 text-purple-600 dark:text-purple-400",
  sp3r: "border-l-4 border-l-red-500 text-red-600 dark:text-red-400",
  sp3m: "border-l-4 border-l-rose-500 text-rose-600 dark:text-rose-400",
};

function StatCard({
  tone,
  icon,
  label,
  value,
}: {
  tone: StatCardTone;
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card className={statStyle[tone]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <div className="mt-2 text-3xl font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">murid</div>
      </CardContent>
    </Card>
  );
}

function CountBadge({
  value,
  active,
  tone,
}: {
  value: number;
  active: boolean;
  tone: "amber" | "blue" | "orange" | "purple" | "red" | "rose";
}) {
  const map: Record<string, string> = {
    amber: "bg-amber-500 text-white",
    blue: "bg-blue-500 text-white",
    orange: "bg-orange-500 text-white",
    purple: "bg-purple-500 text-white",
    red: "bg-red-500 text-white",
    rose: "bg-rose-500 text-white",
  };
  return (
    <span
      className={`ml-2 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
        active ? map[tone] : "bg-muted text-muted-foreground"
      }`}
    >
      {value}
    </span>
  );
}

function BpBkPage() {
  const { data } = Route.useLoaderData();
  const qc = useQueryClient();
  const getData = useServerFn(getBpBkData);
  const removeFn = useServerFn(deleteSp);

  const { data: bp } = useSuspenseQuery({
    queryKey: ["bpbk"],
    queryFn: () => getData(),
    initialData: data,
  });

  const [tab, setTab] = useState<"rek1" | "murid1" | "rek2" | "murid2" | "rek3" | "murid3">("rek1");
  const [search, setSearch] = useState("");
  const [rombelFilter, setRombelFilter] = useState<string>("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["bpbk"] });

  const del = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("SP dihapus");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filterFn = (rows: any[]) => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (rombelFilter !== "all" && r.rombel_id !== rombelFilter) return false;
      if (!q) return true;
      return (
        (r.name ?? r.student_name ?? "").toLowerCase().includes(q) ||
        (r.nis ?? r.student_nis ?? "").toLowerCase().includes(q)
      );
    });
  };

  const rek1 = useMemo(() => filterFn(bp.rekomendasi[1]), [bp, search, rombelFilter]);
  const rek2 = useMemo(() => filterFn(bp.rekomendasi[2]), [bp, search, rombelFilter]);
  const rek3 = useMemo(() => filterFn(bp.rekomendasi[3]), [bp, search, rombelFilter]);
  const mur1 = useMemo(() => filterFn(bp.murid[1]), [bp, search, rombelFilter]);
  const mur2 = useMemo(() => filterFn(bp.murid[2]), [bp, search, rombelFilter]);
  const mur3 = useMemo(() => filterFn(bp.murid[3]), [bp, search, rombelFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen BP/BK</h1>
        <p className="text-sm text-muted-foreground">
          Kelola Surat Peringatan (SP) untuk siswa
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard tone="sp1r" icon={<AlertTriangle className="h-4 w-4" />} label="Rekomendasi SP 1" value={bp.counts.rek1} />
        <StatCard tone="sp1m" icon={<Users className="h-4 w-4" />} label="Murid SP 1" value={bp.counts.murid1} />
        <StatCard tone="sp2r" icon={<AlertTriangle className="h-4 w-4" />} label="Rekomendasi SP 2" value={bp.counts.rek2} />
        <StatCard tone="sp2m" icon={<Users className="h-4 w-4" />} label="Murid SP 2" value={bp.counts.murid2} />
        <StatCard tone="sp3r" icon={<AlertTriangle className="h-4 w-4" />} label="Rekomendasi SP 3" value={bp.counts.rek3} />
        <StatCard tone="sp3m" icon={<Users className="h-4 w-4" />} label="Murid SP 3" value={bp.counts.murid3} />
      </div>

      {/* Search + rombel filter */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={rombelFilter} onValueChange={setRombelFilter}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Semua Rombel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Rombel</SelectItem>
            {bp.rombelList.map((r: any) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-2">
          <TabsTrigger value="rek1" className="data-[state=active]:bg-background">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Rekomendasi SP 1
            <CountBadge value={bp.counts.rek1} active={tab === "rek1"} tone="amber" />
          </TabsTrigger>
          <TabsTrigger value="murid1" className="data-[state=active]:bg-background">
            Murid dengan SP 1
            <CountBadge value={bp.counts.murid1} active={tab === "murid1"} tone="blue" />
          </TabsTrigger>
          <TabsTrigger value="rek2" className="data-[state=active]:bg-background">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
            Rekomendasi SP 2
            <CountBadge value={bp.counts.rek2} active={tab === "rek2"} tone="orange" />
          </TabsTrigger>
          <TabsTrigger value="murid2" className="data-[state=active]:bg-background">
            Murid dengan SP 2
            <CountBadge value={bp.counts.murid2} active={tab === "murid2"} tone="purple" />
          </TabsTrigger>
          <TabsTrigger value="rek3" className="data-[state=active]:bg-background">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-red-500" />
            Rekomendasi Pindah / SP 3
            <CountBadge value={bp.counts.rek3} active={tab === "rek3"} tone="red" />
          </TabsTrigger>
          <TabsTrigger value="murid3" className="data-[state=active]:bg-background">
            Murid dengan SP 3
            <CountBadge value={bp.counts.murid3} active={tab === "murid3"} tone="rose" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rek1" className="mt-4">
          <RekomendasiTable level={1} rows={rek1} onCreated={invalidate} thresholds={bp.thresholds} />
        </TabsContent>
        <TabsContent value="rek2" className="mt-4">
          <RekomendasiTable level={2} rows={rek2} onCreated={invalidate} thresholds={bp.thresholds} />
        </TabsContent>
        <TabsContent value="rek3" className="mt-4">
          <RekomendasiTable level={3} rows={rek3} onCreated={invalidate} thresholds={bp.thresholds} />
        </TabsContent>
        <TabsContent value="murid1" className="mt-4">
          <MuridSpTable level={1} rows={mur1} onDelete={(id) => del.mutate(id)} />
        </TabsContent>
        <TabsContent value="murid2" className="mt-4">
          <MuridSpTable level={2} rows={mur2} onDelete={(id) => del.mutate(id)} />
        </TabsContent>
        <TabsContent value="murid3" className="mt-4">
          <MuridSpTable level={3} rows={mur3} onDelete={(id) => del.mutate(id)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const levelColor: Record<number, string> = {
  1: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  2: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  3: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

const levelHeader: Record<number, { title: string; sub: string; btn: string }> = {
  1: {
    title: "Rekomendasi SP 1",
    sub: "Murid dengan jumlah Alfa > 3 dan/atau Terlambat > 5",
    btn: "Beri SP 1",
  },
  2: {
    title: "Rekomendasi SP 2",
    sub: "Murid dengan jumlah Alfa > 6 dan/atau Terlambat > 10, sudah memiliki SP 1",
    btn: "Beri SP 2",
  },
  3: {
    title: "Rekomendasi Pindah / SP 3",
    sub: "Murid dengan jumlah Alfa > 10 dan/atau Terlambat > 15, sudah memiliki SP 2",
    btn: "Beri SP 3",
  },
};

function CountPill({ value, danger }: { value: number; danger: boolean }) {
  return (
    <span
      className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-semibold ${
        danger ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
      }`}
    >
      {value}
    </span>
  );
}

function RekomendasiTable({
  level,
  rows,
  onCreated,
  thresholds,
}: {
  level: 1 | 2 | 3;
  rows: any[];
  onCreated: () => void;
  thresholds: any;
}) {
  const head = levelHeader[level];
  const th = thresholds[level];
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              className={`h-4 w-4 ${level === 1 ? "text-amber-500" : level === 2 ? "text-orange-500" : "text-red-500"}`}
            />
            {head.title}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{head.sub}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIS</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead className="text-center">Jml Alfa</TableHead>
              <TableHead className="text-center">Jml Terlambat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada rekomendasi
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.nis}</TableCell>
                  <TableCell>{r.rombel_name}</TableCell>
                  <TableCell className="text-center">
                    <CountPill value={r.alfa} danger={r.alfa > th.alfa} />
                  </TableCell>
                  <TableCell className="text-center">
                    <CountPill value={r.telat} danger={r.telat > th.telat} />
                  </TableCell>
                  <TableCell className="text-right">
                    <BeriSpDialog level={level} student={r} onCreated={onCreated} btnLabel={head.btn} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BeriSpDialog({
  level,
  student,
  onCreated,
  btnLabel,
}: {
  level: 1 | 2 | 3;
  student: any;
  onCreated: () => void;
  btnLabel: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const createFn = useServerFn(createSp);
  const [form, setForm] = useState({
    tanggalRekaman: today,
    alasan: "",
    jumlahAlfa: student.alfa ?? 0,
    jumlahTerlambat: student.telat ?? 0,
    dokumenPendukung: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          studentId: student.id,
          spLevel: level,
          tanggalRekaman: form.tanggalRekaman,
          alasan: form.alasan,
          jumlahAlfa: form.jumlahAlfa,
          jumlahTerlambat: form.jumlahTerlambat,
          dokumenPendukung: form.dokumenPendukung,
        },
      }),
    onSuccess: () => {
      toast.success(`SP ${level} berhasil dicatat`);
      setOpen(false);
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="mr-1 h-3.5 w-3.5" />
          {btnLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {btnLabel} — {student.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">NIS:</span> {student.nis}
            </div>
            <div>
              <span className="text-muted-foreground">Rombel:</span> {student.rombel_name}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={form.tanggalRekaman}
                onChange={(e) => setForm({ ...form, tanggalRekaman: e.target.value })}
              />
            </div>
            <div />
            <div className="space-y-1">
              <Label>Jumlah Alfa</Label>
              <Input
                type="number"
                min={0}
                value={form.jumlahAlfa}
                onChange={(e) => setForm({ ...form, jumlahAlfa: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Jumlah Terlambat</Label>
              <Input
                type="number"
                min={0}
                value={form.jumlahTerlambat}
                onChange={(e) => setForm({ ...form, jumlahTerlambat: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Alasan / Pelanggaran</Label>
            <Textarea
              rows={3}
              value={form.alasan}
              onChange={(e) => setForm({ ...form, alasan: e.target.value })}
              placeholder="Deskripsikan pelanggaran..."
            />
          </div>
          <div className="space-y-1">
            <Label>Link Dokumen Pendukung (opsional)</Label>
            <Input
              type="url"
              value={form.dokumenPendukung}
              onChange={(e) => setForm({ ...form, dokumenPendukung: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              if (!form.alasan || form.alasan.length < 3) return toast.error("Alasan minimal 3 karakter");
              create.mutate();
            }}
            disabled={create.isPending}
          >
            {create.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MuridSpTable({
  level,
  rows,
  onDelete,
}: {
  level: 1 | 2 | 3;
  rows: any[];
  onDelete: (id: string) => void;
}) {
  const [detail, setDetail] = useState<any | null>(null);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Murid dengan SP {level}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Daftar murid yang sudah mendapat Surat Peringatan {level}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIS</TableHead>
              <TableHead>Rombel</TableHead>
              <TableHead>Tanggal SP {level}</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead className="text-center">Jml Alfa</TableHead>
              <TableHead className="text-center">Jml Terlambat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Belum ada catatan SP {level}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.student_name}</TableCell>
                  <TableCell>{r.student_nis}</TableCell>
                  <TableCell>{r.rombel_name}</TableCell>
                  <TableCell>{r.tanggal_rekaman}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={r.alasan}>
                    {r.alasan}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={levelColor[level]}>
                      {r.jumlah_alfa}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={levelColor[level]}>
                      {r.jumlah_terlambat}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDetail(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {r.dokumen_pendukung && (
                        <Button size="icon" variant="ghost" asChild>
                          <a href={r.dokumen_pendukung} target="_blank" rel="noreferrer">
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Hapus catatan SP ini?")) onDelete(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail SP {level}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Nama: </span>{detail.student_name}</div>
              <div><span className="text-muted-foreground">NIS: </span>{detail.student_nis}</div>
              <div><span className="text-muted-foreground">Rombel: </span>{detail.rombel_name}</div>
              <div><span className="text-muted-foreground">Tanggal: </span>{detail.tanggal_rekaman}</div>
              <div><span className="text-muted-foreground">Jumlah Alfa: </span>{detail.jumlah_alfa}</div>
              <div><span className="text-muted-foreground">Jumlah Terlambat: </span>{detail.jumlah_terlambat}</div>
              <div>
                <div className="text-muted-foreground">Alasan:</div>
                <div className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/40 p-2">
                  {detail.alasan || "—"}
                </div>
              </div>
              {detail.dokumen_pendukung && (
                <div>
                  <a
                    className="text-primary underline"
                    href={detail.dokumen_pendukung}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buka dokumen pendukung
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
