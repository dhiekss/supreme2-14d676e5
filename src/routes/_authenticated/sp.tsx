import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  getBpBkData,
  getBpBkThresholds,
  saveBpBkThresholds,
  listWaliTindakan,
  saveWaliTindakan,
  getWaliTindakanFotoUrl,
  searchStudentsForSp,
} from "@/lib/bpbk.functions";
import { supabase } from "@/integrations/supabase/client";
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
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserCheck,
  ClipboardCheck,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Thresholds = {
  mulaiTanggal: string;
  waliAlfa: number;
  waliTelat: number;
  sp1Alfa: number;
  sp1Telat: number;
  sp2Alfa: number;
  sp2Telat: number;
  sp3Alfa: number;
  sp3Telat: number;
};

const DEFAULT_TH: Thresholds = {
  mulaiTanggal: "",
  waliAlfa: 1,
  waliTelat: 2,
  sp1Alfa: 3,
  sp1Telat: 5,
  sp2Alfa: 6,
  sp2Telat: 10,
  sp3Alfa: 10,
  sp3Telat: 15,
};

const TH_STORAGE_KEY = "bpbk-thresholds-v1";

function loadThresholds(): Thresholds {
  if (typeof window === "undefined") return DEFAULT_TH;
  try {
    const raw = localStorage.getItem(TH_STORAGE_KEY);
    if (!raw) return DEFAULT_TH;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TH, ...parsed };
  } catch {
    return DEFAULT_TH;
  }
}


export const Route = createFileRoute("/_authenticated/sp")({
  head: () => ({ meta: [{ title: "Manajemen BP/BK — SUPREME XPOES" }] }),
  component: BpBkPage,
  pendingComponent: () => (
    <div className="p-6 text-sm text-muted-foreground">Memuat data BP/BK…</div>
  ),
  errorComponent: ({ error }) => (
    <div className="text-destructive">Gagal: {error.message}</div>
  ),
});


type StatCardTone = "wali" | "sp1r" | "sp1m" | "sp2r" | "sp2m" | "sp3r" | "sp3m";

const statStyle: Record<StatCardTone, string> = {
  wali: "border-l-4 border-l-emerald-500 text-emerald-600 dark:text-emerald-400",
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
  tone: "emerald" | "amber" | "blue" | "orange" | "purple" | "red" | "rose";
}) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500 text-white",
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
  const qc = useQueryClient();
  const getData = useServerFn(getBpBkData);
  const removeFn = useServerFn(deleteSp);
  const getTh = useServerFn(getBpBkThresholds);
  const saveTh = useServerFn(saveBpBkThresholds);

  const { data: savedTh } = useSuspenseQuery({
    queryKey: ["bpbk-thresholds"],
    queryFn: () => getTh(),
  });

  const thresholds: Thresholds = useMemo(() => {
    const merged = { ...DEFAULT_TH, ...loadThresholds(), ...(savedTh ?? {}) };
    return { ...merged, mulaiTanggal: merged.mulaiTanggal ?? "" };
  }, [savedTh]);


  const { data: bp } = useSuspenseQuery({
    queryKey: ["bpbk", thresholds],
    queryFn: () => getData({ data: thresholds }),
  });

  const saveThM = useMutation({
    mutationFn: (v: Thresholds) => saveTh({ data: v }),
    onSuccess: () => {
      toast.success("Pengaturan ambang batas SP disimpan");
      qc.invalidateQueries({ queryKey: ["bpbk-thresholds"] });
      qc.invalidateQueries({ queryKey: ["bpbk"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan pengaturan"),
  });

  const [tab, setTab] = useState<"wali" | "rek1" | "murid1" | "rek2" | "murid2" | "rek3" | "murid3">("wali");
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

  const listTindakanFn = useServerFn(listWaliTindakan);
  const { data: tindakanRows } = useQuery({
    queryKey: ["wali-tindakan"],
    queryFn: () => listTindakanFn(),
  });
  const tindakanMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const t of tindakanRows ?? []) {
      const prev = m.get(t.student_id);
      if (!prev || (t.tanggal ?? "") > (prev.tanggal ?? "")) m.set(t.student_id, t);
    }
    return m;
  }, [tindakanRows]);

  const wali = useMemo(() => filterFn(bp.perluWali ?? []), [bp, search, rombelFilter]);
  const rek1 = useMemo(() => filterFn(bp.rekomendasi[1]), [bp, search, rombelFilter]);
  const rek2 = useMemo(() => filterFn(bp.rekomendasi[2]), [bp, search, rombelFilter]);
  const rek3 = useMemo(() => filterFn(bp.rekomendasi[3]), [bp, search, rombelFilter]);
  const mur1 = useMemo(() => filterFn(bp.murid[1]), [bp, search, rombelFilter]);
  const mur2 = useMemo(() => filterFn(bp.murid[2]), [bp, search, rombelFilter]);
  const mur3 = useMemo(() => filterFn(bp.murid[3]), [bp, search, rombelFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen BP/BK</h1>
          <p className="text-sm text-muted-foreground">
            Kelola Surat Peringatan (SP) untuk murid
          </p>
        </div>
        <ThresholdSettingsDialog
          value={thresholds}
          saving={saveThM.isPending}
          onSave={(next) => {
            try {
              localStorage.setItem(TH_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            saveThM.mutate(next);
          }}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <StatCard tone="wali" icon={<UserCheck className="h-4 w-4" />} label="Perlu Tindakan Wali Kelas" value={bp.counts.wali ?? 0} />
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
          <TabsTrigger value="wali" className="data-[state=active]:bg-background">
            <UserCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            Perlu Tindakan Wali Kelas
            <CountBadge value={bp.counts.wali ?? 0} active={tab === "wali"} tone="emerald" />
          </TabsTrigger>
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

        <TabsContent value="wali" className="mt-4">
          <WaliTable
            rows={wali}
            threshold={bp.waliThreshold}
            tindakanMap={tindakanMap}
            onSaved={() => qc.invalidateQueries({ queryKey: ["wali-tindakan"] })}
          />
        </TabsContent>
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

function makeLevelHeader(level: 1 | 2 | 3, th: { alfa: number; telat: number }) {
  if (level === 1) {
    return {
      title: "Rekomendasi SP 1",
      sub: `Murid dengan jumlah Alfa > ${th.alfa} dan/atau Terlambat > ${th.telat}`,
      btn: "Beri SP 1",
    };
  }
  if (level === 2) {
    return {
      title: "Rekomendasi SP 2",
      sub: `Murid dengan jumlah Alfa > ${th.alfa} dan/atau Terlambat > ${th.telat}, sudah memiliki SP 1`,
      btn: "Beri SP 2",
    };
  }
  return {
    title: "Rekomendasi Pindah / SP 3",
    sub: `Murid dengan jumlah Alfa > ${th.alfa} dan/atau Terlambat > ${th.telat}, sudah memiliki SP 2`,
    btn: "Beri SP 3",
  };
}

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

type SortDir = "asc" | "desc";
function useSort<K extends string>(defaultKey: K | null = null) {
  const [key, setKey] = useState<K | null>(defaultKey);
  const [dir, setDir] = useState<SortDir>("asc");
  function toggle(k: K) {
    if (key === k) {
      if (dir === "asc") setDir("desc");
      else {
        setKey(null);
        setDir("asc");
      }
    } else {
      setKey(k);
      setDir("asc");
    }
  }
  return { key, dir, toggle };
}

function SortHead<K extends string>({
  label,
  sortKey,
  state,
  className,
}: {
  label: string;
  sortKey: K;
  state: { key: K | null; dir: SortDir; toggle: (k: K) => void };
  className?: string;
}) {
  const active = state.key === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => state.toggle(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none"
      >
        {label}
        {active ? (
          state.dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
        )}
      </button>
    </TableHead>
  );
}

function sortRows<T>(rows: T[], key: keyof T | null, dir: SortDir): T[] {
  if (!key) return rows;
  const arr = [...rows];
  arr.sort((a: any, b: any) => {
    const va = a[key];
    const vb = b[key];
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
    return dir === "asc" ? cmp : -cmp;
  });
  return arr;
}

function WaliTable({
  rows,
  threshold,
  tindakanMap,
  onSaved,
}: {
  rows: any[];
  threshold: { alfa: number; telat: number };
  tindakanMap: Map<string, any>;
  onSaved: () => void;
}) {
  const sort = useSort<
    "name" | "nis" | "rombel_name" | "wali_kelas" | "alfa" | "telat" | "status" | "tgl_tindakan"
  >("name");
  const merged = useMemo(
    () =>
      rows.map((r) => {
        const t = tindakanMap.get(r.id);
        return {
          ...r,
          tindakan: t ?? null,
          status: t ? "Sudah" : "Belum",
          tgl_tindakan: t?.tanggal ?? "",
        };
      }),
    [rows, tindakanMap],
  );
  const data = useMemo(() => sortRows(merged, sort.key as any, sort.dir), [merged, sort.key, sort.dir]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-4 w-4 text-emerald-500" />
          Perlu Tindakan Wali Kelas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Murid dengan Alfa &gt; {threshold?.alfa ?? 1} dan/atau Terlambat &gt; {threshold?.telat ?? 2},
          belum mencapai ambang SP 1. Tangani terlebih dahulu oleh wali kelas.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 sm:p-6 sm:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Nama Murid" sortKey="name" state={sort} />
              <SortHead label="NIPD" sortKey="nis" state={sort} />
              <SortHead label="Rombel" sortKey="rombel_name" state={sort} />
              <SortHead label="Wali Kelas" sortKey="wali_kelas" state={sort} />
              <SortHead label="Alfa" sortKey="alfa" state={sort} className="text-center" />
              <SortHead label="Terlambat" sortKey="telat" state={sort} className="text-center" />
              <SortHead label="Keterangan" sortKey="status" state={sort} className="text-center" />
              <SortHead label="Tanggal Tindakan" sortKey="tgl_tindakan" state={sort} />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada murid yang perlu tindakan wali kelas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.nis}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.rombel_name}</Badge>
                  </TableCell>
                  <TableCell>{r.wali_kelas ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <CountPill value={r.alfa} danger={r.alfa > (threshold?.alfa ?? 1)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <CountPill value={r.telat} danger={r.telat > (threshold?.telat ?? 2)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        r.tindakan
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }
                      variant="outline"
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.tgl_tindakan || "—"}</TableCell>
                  <TableCell className="text-right">
                    <TindakanDialog row={r} onSaved={onSaved} />
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

function TindakanDialog({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const existing = row.tindakan;
  const [tanggal, setTanggal] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const saveFn = useServerFn(saveWaliTindakan);
  const fotoUrlFn = useServerFn(getWaliTindakanFotoUrl);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: existing?.id ?? null,
          studentId: row.id,
          rombelId: row.rombel_id ?? null,
          tanggal,
          jumlahAlfa: Number(row.alfa ?? 0),
          jumlahTerlambat: Number(row.telat ?? 0),
          keterangan,
          fotoPath,
        },
      }),
    onSuccess: () => {
      toast.success("Tindakan wali kelas tersimpan");
      setOpen(false);
      onSaved();
    },
    onError: (e: any) => toast.error(e.message ?? "Gagal menyimpan tindakan"),
  });

  async function openChange(o: boolean) {
    setOpen(o);
    if (!o) return;
    setTanggal(existing?.tanggal ?? new Date().toLocaleDateString("en-CA"));
    setKeterangan(existing?.keterangan ?? "");
    setFotoPath(existing?.foto_path ?? null);
    setFotoUrl(null);
    if (existing?.foto_path) {
      try {
        const res = await fotoUrlFn({ data: { path: existing.foto_path } });
        setFotoUrl(res.url);
      } catch {
        setFotoUrl(null);
      }
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const key = `tindakan-wali/${row.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sp-dokumen").upload(key, file, { upsert: false });
      if (error) throw new Error(error.message);
      setFotoPath(key);
      const res = await fotoUrlFn({ data: { path: key } });
      setFotoUrl(res.url);
      toast.success("Foto terunggah");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existing ? "outline" : "default"}>
          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
          Tindakan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tindakan Wali Kelas</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nama Murid</Label>
              <Input value={row.name ?? ""} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Rombel</Label>
              <Input value={row.rombel_name ?? ""} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>NIPD</Label>
              <Input value={row.nis ?? ""} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Alfa</Label>
              <Input value={row.alfa ?? 0} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-1.5">
              <Label>Jumlah Terlambat</Label>
              <Input value={row.telat ?? 0} readOnly className="bg-muted/50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Keterangan Tindak Lanjut</Label>
            <Textarea
              rows={4}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Tuliskan tindak lanjut yang sudah dilakukan wali kelas..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Foto Dokumentasi</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            {uploading && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunggah…
              </p>
            )}
            {fotoUrl && (
              <img
                src={fotoUrl}
                alt={`Dokumentasi tindakan ${row.name ?? "murid"}`}
                className="mt-2 max-h-56 rounded-md border object-contain"
              />
            )}
            {!fotoUrl && fotoPath && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Upload className="h-3.5 w-3.5" /> {fotoPath}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button disabled={!tanggal || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Menyimpan…" : "Simpan Tindakan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdSettingsDialog({
  value,
  onSave,
  saving,
}: {
  value: Thresholds;
  onSave: (v: Thresholds) => void;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Thresholds>(value);

  function reset() {
    setForm(DEFAULT_TH);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setForm(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Pengaturan Ambang
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ambang Batas Rekomendasi SP</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Murid akan muncul di daftar rekomendasi bila jumlah Alfa <em>atau</em> Terlambat
          melebihi (&gt;) ambang batas berikut.
        </p>

        <div className="rounded-md border p-3">
          <Label className="text-xs">Tanggal mulai berlaku (periode berjalan)</Label>
          <Input
            type="date"
            className="mt-1"
            value={form.mulaiTanggal}
            onChange={(e) => setForm({ ...form, mulaiTanggal: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Alfa &amp; keterlambatan sebelum tanggal ini tidak dihitung. Kosongkan untuk
            menghitung seluruh riwayat.
          </p>
        </div>

        <div className="rounded-md border border-l-4 border-l-emerald-500 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="h-4 w-4 text-emerald-500" />
            Perlu Tindakan Wali Kelas
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Alfa &gt;</Label>
              <Input
                type="number"
                min={0}
                value={form.waliAlfa}
                onChange={(e) => setForm({ ...form, waliAlfa: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Terlambat &gt;</Label>
              <Input
                type="number"
                min={0}
                value={form.waliTelat}
                onChange={(e) => setForm({ ...form, waliTelat: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {([1, 2, 3] as const).map((lv) => {
            const alfaKey = `sp${lv}Alfa` as keyof Thresholds;
            const telatKey = `sp${lv}Telat` as keyof Thresholds;
            const tone =
              lv === 1
                ? "border-l-amber-500"
                : lv === 2
                  ? "border-l-orange-500"
                  : "border-l-red-500";
            return (
              <div key={lv} className={`rounded-md border border-l-4 ${tone} p-3`}>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle
                    className={`h-4 w-4 ${
                      lv === 1
                        ? "text-amber-500"
                        : lv === 2
                          ? "text-orange-500"
                          : "text-red-500"
                    }`}
                  />
                  SP {lv}
                  {lv === 3 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (Rekomendasi pindah)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Alfa &gt;</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form[alfaKey]}
                      onChange={(e) =>
                        setForm({ ...form, [alfaKey]: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Terlambat &gt;</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form[telatKey]}
                      onChange={(e) =>
                        setForm({ ...form, [telatKey]: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={reset}>
            Kembalikan default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={saving}
              onClick={() => {
                onSave(form);
                setOpen(false);
              }}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const th = thresholds[level];
  const head = makeLevelHeader(level, th);
  const sort = useSort<"name" | "nis" | "rombel_name" | "alfa" | "telat">();
  const sorted = useMemo(
    () => sortRows(rows, sort.key as any, sort.dir),
    [rows, sort.key, sort.dir],
  );
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
              <SortHead label="Nama" sortKey="name" state={sort} />
              <SortHead label="NIS" sortKey="nis" state={sort} />
              <SortHead label="Rombel" sortKey="rombel_name" state={sort} />
              <SortHead label="Jml Alfa" sortKey="alfa" state={sort} className="text-center" />
              <SortHead label="Jml Terlambat" sortKey="telat" state={sort} className="text-center" />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Tidak ada rekomendasi
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r: any, i) => (
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
  const today = new Date().toLocaleDateString("en-CA");
  const [open, setOpen] = useState(false);
  const createFn = useServerFn(createSp);
  const [tanggal, setTanggal] = useState(today);
  const [keterangan, setKeterangan] = useState("");
  const [dokumen, setDokumen] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          studentId: student.id,
          spLevel: level,
          tanggalRekaman: tanggal,
          alasan: keterangan,
          jumlahAlfa: Number(student.alfa ?? 0),
          jumlahTerlambat: Number(student.telat ?? 0),
          dokumenPendukung: dokumen,
        },
      }),
    onSuccess: () => {
      toast.success(`SP ${level} berhasil dicatat`);
      setOpen(false);
      setKeterangan("");
      setDokumen("");
      onCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setTanggal(today);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="mr-1 h-3.5 w-3.5" />
          {btnLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {btnLabel} — {student.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <SpFormFields
            nama={student.name ?? ""}
            rombel={student.rombel_name ?? ""}
            nipd={student.nis ?? ""}
            alfa={student.alfa ?? 0}
            telat={student.telat ?? 0}
            tanggal={tanggal}
            setTanggal={setTanggal}
            keterangan={keterangan}
            setKeterangan={setKeterangan}
            dokumen={dokumen}
            setDokumen={setDokumen}
            studentId={student.id}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              if (keterangan.trim().length < 3) return toast.error("Keterangan minimal 3 karakter");
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
  const sort = useSort<
    "student_name" | "student_nis" | "rombel_name" | "tanggal_rekaman" | "jumlah_alfa" | "jumlah_terlambat"
  >();
  const sorted = useMemo(
    () => sortRows(rows, sort.key as any, sort.dir),
    [rows, sort.key, sort.dir],
  );
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Murid dengan SP {level}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Daftar murid yang sudah mendapat Surat Peringatan {level}
            </p>
          </div>
          <CaseKhususDialog level={level} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <SortHead label="Nama" sortKey="student_name" state={sort} />
              <SortHead label="NIS" sortKey="student_nis" state={sort} />
              <SortHead label="Rombel" sortKey="rombel_name" state={sort} />
              <SortHead label={`Tanggal SP ${level}`} sortKey="tanggal_rekaman" state={sort} />
              <TableHead>Alasan</TableHead>
              <SortHead label="Jml Alfa" sortKey="jumlah_alfa" state={sort} className="text-center" />
              <SortHead label="Jml Terlambat" sortKey="jumlah_terlambat" state={sort} className="text-center" />
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  Belum ada catatan SP {level}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r: any, i) => (
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
                      {r.dokumen_pendukung && <DokButton value={r.dokumen_pendukung} />}
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
                  <DokButton value={detail.dokumen_pendukung} variant="link" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CaseKhususDialog({ level }: { level: 1 | 2 | 3 }) {
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString("en-CA");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<any | null>(null);
  const [tanggal, setTanggal] = useState(today);
  const [alasan, setAlasan] = useState("");
  const [dokumen, setDokumen] = useState("");

  const searchFn = useServerFn(searchStudentsForSp);
  const createFn = useServerFn(createSp);

  const { data: results, isFetching } = useQuery({
    queryKey: ["sp-student-search", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: open,
  });

  const reset = () => {
    setQ("");
    setPicked(null);
    setTanggal(today);
    setAlasan("");
    setDokumen("");
  };

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          studentId: picked.id,
          spLevel: level,
          tanggalRekaman: tanggal,
          alasan: `[Case Khusus] ${alasan}`,
          jumlahAlfa: Number(picked.alfa ?? 0),
          jumlahTerlambat: Number(picked.telat ?? 0),
          dokumenPendukung: dokumen,
        },
      }),
    onSuccess: () => {
      toast.success(`SP ${level} (case khusus) berhasil dicatat`);
      setOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ["bpbk"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FilePlus2 className="mr-1 h-3.5 w-3.5" />
          Case Khusus
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Case Khusus — SP {level}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Untuk mencatat SP {level} di luar pelanggaran jumlah alfa dan terlambat.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cari Murid (nama / NIPD)</Label>
            {picked ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2 text-xs">
                <span>
                  <span className="font-medium">{picked.name}</span> · {picked.nis} · {picked.rombel_name}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
                  Ganti
                </Button>
              </div>
            ) : (
              <>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama atau NIPD..." />
                <div className="max-h-44 overflow-y-auto rounded-md border">
                  {isFetching ? (
                    <div className="p-2 text-xs text-muted-foreground">Memuat...</div>
                  ) : (results ?? []).length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Tidak ada murid ditemukan</div>
                  ) : (
                    (results ?? []).map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        className="block w-full px-2 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => setPicked(s)}
                      >
                        <span className="font-medium">{s.name}</span>{" "}
                        <span className="text-muted-foreground">
                          · {s.nis} · {s.rombel_name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <SpFormFields
            nama={picked?.name ?? ""}
            rombel={picked?.rombel_name ?? ""}
            nipd={picked?.nis ?? ""}
            alfa={picked?.alfa ?? 0}
            telat={picked?.telat ?? 0}
            tanggal={tanggal}
            setTanggal={setTanggal}
            keterangan={alasan}
            setKeterangan={setAlasan}
            dokumen={dokumen}
            setDokumen={setDokumen}
            studentId={picked?.id ?? "umum"}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              if (!picked) return toast.error("Pilih murid terlebih dahulu");
              if (alasan.trim().length < 3) return toast.error("Keterangan minimal 3 karakter");
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

/** Bagian isian standar dialog SP: identitas auto-read, tanggal manual,
 *  jumlah alfa/terlambat readonly, keterangan tindak lanjut, foto dokumentasi. */
function SpFormFields({
  nama,
  rombel,
  nipd,
  alfa,
  telat,
  tanggal,
  setTanggal,
  keterangan,
  setKeterangan,
  dokumen,
  setDokumen,
  studentId,
}: {
  nama: string;
  rombel: string;
  nipd: string;
  alfa: number;
  telat: number;
  tanggal: string;
  setTanggal: (v: string) => void;
  keterangan: string;
  setKeterangan: (v: string) => void;
  dokumen: string;
  setDokumen: (v: string) => void;
  studentId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const fotoUrlFn = useServerFn(getWaliTindakanFotoUrl);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const key = `sp/${studentId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sp-dokumen").upload(key, file, { upsert: false });
      if (error) throw new Error(error.message);
      setDokumen(key);
      const res = await fotoUrlFn({ data: { path: key } });
      setFotoUrl(res.url);
      toast.success("Foto terunggah");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Nama Murid</Label>
          <Input value={nama} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>Rombel</Label>
          <Input value={rombel} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>NIPD</Label>
          <Input value={nipd} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Jumlah Alfa</Label>
          <Input value={alfa} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-1.5">
          <Label>Jumlah Terlambat</Label>
          <Input value={telat} readOnly className="bg-muted/50" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Keterangan Tindak Lanjut</Label>
        <Textarea
          rows={4}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Tuliskan tindak lanjut / alasan pemberian SP..."
        />
      </div>
      <div className="space-y-1.5">
        <Label>Foto Dokumentasi</Label>
        <Input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
          }}
        />
        {uploading && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunggah…
          </p>
        )}
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt={`Dokumentasi SP ${nama || "murid"}`}
            className="mt-2 max-h-56 rounded-md border object-contain"
          />
        )}
        {!fotoUrl && dokumen && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Upload className="h-3.5 w-3.5" /> {dokumen}
          </p>
        )}
      </div>
    </>
  );
}

/** Tombol buka dokumen: URL eksternal dibuka langsung, path storage
 *  di-resolve dulu menjadi signed URL. */
function DokButton({ value, variant = "icon" }: { value: string; variant?: "icon" | "link" }) {
  const fotoUrlFn = useServerFn(getWaliTindakanFotoUrl);
  const [loading, setLoading] = useState(false);

  async function open() {
    if (/^https?:\/\//i.test(value)) {
      window.open(value, "_blank", "noopener");
      return;
    }
    setLoading(true);
    try {
      const res = await fotoUrlFn({ data: { path: value } });
      if (res.url) window.open(res.url, "_blank", "noopener");
      else toast.error("Dokumen tidak ditemukan");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal membuka dokumen");
    } finally {
      setLoading(false);
    }
  }

  if (variant === "link") {
    return (
      <button type="button" className="text-primary underline" onClick={open} disabled={loading}>
        {loading ? "Membuka…" : "Buka dokumen pendukung"}
      </button>
    );
  }
  return (
    <Button size="icon" variant="ghost" onClick={open} disabled={loading} title="Buka dokumen pendukung">
      <FileText className="h-4 w-4" />
    </Button>
  );
}
