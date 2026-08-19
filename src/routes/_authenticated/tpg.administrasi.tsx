import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { listAdministrasi, upsertAdministrasi, signTpgBukti } from "@/lib/tpg.functions";
import { CheckCircle2, Eye, Pencil, Save, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { BULAN, BULAN_FULL, fmtRp, TpgHeader, PeriodeFilter } from "@/components/tpg/shared";

export const Route = createFileRoute("/_authenticated/tpg/administrasi")({
  ssr: false,
  head: () => ({ meta: [{ title: "Administrasi TPG — SUPREME XPOES" }] }),
  component: AdministrasiPage,
  errorComponent: ({ error }) => <div className="text-destructive">Gagal: {error.message}</div>,
});

function fmtDateTime(v: string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// Dialog View: detail baris laporan + bukti transfer yang diunggah user.
function DetailDialog({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [loadingBukti, setLoadingBukti] = useState(false);
  const signFn = useServerFn(signTpgBukti);

  async function openChange(o: boolean) {
    setOpen(o);
    if (!o) return;
    setBuktiUrl(null);
    const bukti = row.laporan_bukti;
    if (!bukti) return;
    if (/^https?:\/\//.test(bukti)) {
      setBuktiUrl(bukti);
      return;
    }
    setLoadingBukti(true);
    try {
      const res = await signFn({ data: { path: bukti } });
      setBuktiUrl(res.url);
    } catch {
      toast.error("Gagal memuat bukti transfer");
    } finally {
      setLoadingBukti(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Lihat Detail"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Detail Administrasi TPG</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-semibold">{row.guru_nama}</p>
            <p className="text-sm text-muted-foreground">NIP: {row.guru_nip}</p>
            <p className="text-sm text-muted-foreground">Periode: {BULAN_FULL[row.bulan - 1]} {row.tahun}</p>
            <p className="text-sm text-muted-foreground">Nominal TPG: {fmtRp(row.laporan_nominal)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status Administrasi</p>
              {row.sudah_administrasi ? (
                <Badge variant="default" className="gap-1 mt-1"><CheckCircle2 className="h-3 w-3" /> Sudah</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 mt-1"><XCircle className="h-3 w-3" /> Belum</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Administrasi</p>
              <p className="font-medium mt-1">{fmtDateTime(row.tanggal_administrasi)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nominal Iuran</p>
              <p className="font-medium mt-1">{fmtRp(row.nominal_iuran)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tanggal Lapor</p>
              <p className="font-medium mt-1">{fmtDateTime(row.laporan_created_at)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Bukti Transfer</p>
            {loadingBukti ? (
              <p className="text-sm text-muted-foreground">Memuat bukti…</p>
            ) : buktiUrl ? (
              <a href={buktiUrl} target="_blank" rel="noreferrer">
                <img src={buktiUrl} alt="Bukti transfer" className="max-h-72 w-full rounded-md border object-contain" />
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada bukti yang diunggah.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dialog Edit sesuai desain: info guru + radio status + nominal iuran + tombol Simpan.
function EditDialog({ row, onSaved }: { row: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [sudah, setSudah] = useState(false);
  const [nominal, setNominal] = useState("0");
  const saveFn = useServerFn(upsertAdministrasi);

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      id: row.id,
      sudah_administrasi: sudah,
      nominal_iuran: Number(nominal) || 0,
    }}),
    onSuccess: () => { toast.success("Administrasi tersimpan"); setOpen(false); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  function openChange(o: boolean) {
    setOpen(o);
    if (o) {
      setSudah(!!row.sudah_administrasi);
      setNominal(String(row.nominal_iuran ?? 0));
    }
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Edit Administrasi"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Administrasi TPG</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-semibold">{row.guru_nama}</p>
            <p className="text-sm text-muted-foreground">Periode: {BULAN_FULL[row.bulan - 1]} {row.tahun}</p>
            <p className="text-sm text-muted-foreground">Nominal TPG: {fmtRp(row.laporan_nominal)}</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="radio"
              checked={sudah}
              onChange={() => setSudah(true)}
              onClick={() => setSudah((v) => !v)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-medium">Sudah Memberikan Administrasi</span>
          </label>
          <div className="space-y-2">
            <Label>Nominal Iuran (Rp)</Label>
            <Input
              inputMode="numeric"
              value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> {save.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SortKey = "nip" | "nama" | "periode" | "status" | "iuran" | "tanggal";

function AdministrasiPage() {
  const today = new Date();
  const [bulan, setBulan] = useState<string>(String(today.getMonth() + 1));
  const [tahun, setTahun] = useState<string>(String(today.getFullYear()));
  const [guruFilter, setGuruFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(false);
  const fetchFn = useServerFn(listAdministrasi);
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["tpg-adm", bulan, tahun],
    queryFn: () => fetchFn({ data: {
      bulan: bulan === "all" ? undefined : Number(bulan),
      tahun: Number(tahun),
    } }),
  });
  const rows = data.rows;
  const isAdmin = data.is_admin;
  const onSaved = () => queryClient.invalidateQueries({ queryKey: ["tpg-adm"] });

  const guruOptions = useMemo(() => {
    const map = new Map<string, { id: string; nama: string; nip: string }>();
    rows.forEach((r: any) => {
      if (r.guru_id && !map.has(r.guru_id)) {
        map.set(r.guru_id, { id: r.guru_id, nama: r.guru_nama, nip: r.guru_nip });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (guruFilter === "all") return rows;
    return rows.filter((r: any) => r.guru_id === guruFilter);
  }, [rows, guruFilter]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a: any, b: any) => {
      let cmp = 0;
      switch (sortKey) {
        case "nip":
          cmp = String(a.guru_nip ?? "").localeCompare(String(b.guru_nip ?? ""));
          break;
        case "nama":
          cmp = String(a.guru_nama ?? "").localeCompare(String(b.guru_nama ?? ""));
          break;
        case "periode":
          cmp = (a.tahun - b.tahun) || (a.bulan - b.bulan);
          break;
        case "status":
          cmp = Number(!!a.sudah_administrasi) - Number(!!b.sudah_administrasi);
          break;
        case "iuran":
          cmp = Number(a.nominal_iuran ?? 0) - Number(b.nominal_iuran ?? 0);
          break;
        case "tanggal":
          const da = a.tanggal_administrasi ? new Date(a.tanggal_administrasi).getTime() : 0;
          const db = b.tanggal_administrasi ? new Date(b.tanggal_administrasi).getTime() : 0;
          cmp = da - db;
          break;
      }
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [filteredRows, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (!sortDesc) setSortDesc(true);
      else {
        setSortKey(null);
        setSortDesc(false);
      }
    } else {
      setSortKey(key);
      setSortDesc(false);
    }
  }

  function SortHeader({ key: k, children, className }: { key: SortKey; children: React.ReactNode; className?: string }) {
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="flex items-center gap-1 hover:text-foreground focus:outline-none"
        >
          {children}
          {sortKey === k ? (
            sortDesc ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}
        </button>
      </TableHead>
    );
  }

  const total = sortedRows.reduce((s: number, r: any) => s + Number(r.nominal_iuran ?? 0), 0);
  const sudah = sortedRows.filter((r: any) => r.sudah_administrasi).length;

  return (
    <div className="space-y-6">
      <TpgHeader title="Administrasi TPG" desc="Status administrasi Tunjangan Profesi Guru per periode." />
      <Card>
        <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <PeriodeFilter bulan={bulan} setBulan={setBulan} tahun={tahun} setTahun={setTahun} />
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select value={guruFilter} onValueChange={setGuruFilter}>
                <SelectTrigger><SelectValue placeholder="Semua Guru" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Guru</SelectItem>
                  {guruOptions.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.nama} {g.nip ? `(${g.nip})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Administrasi — {sortedRows.length} entri ({sudah} sudah)</CardTitle>
          <div className="text-sm font-semibold">Total Iuran: {fmtRp(total)}</div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHeader key="nip">NIP</SortHeader>
                <SortHeader key="nama">Nama Guru</SortHeader>
                <SortHeader key="periode">Periode</SortHeader>
                <SortHeader key="status">Status</SortHeader>
                <SortHeader key="iuran">Nominal Iuran</SortHeader>
                <SortHeader key="tanggal">Tgl Administrasi</SortHeader>
                <TableHead className="w-[120px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              ) : sortedRows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guru_nip}</TableCell>
                  <TableCell>{r.guru_nama}</TableCell>
                  <TableCell>{BULAN[r.bulan-1]} {r.tahun}</TableCell>
                  <TableCell>
                    {r.sudah_administrasi ? (
                      <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sudah</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Belum</Badge>
                    )}
                  </TableCell>
                  <TableCell>{fmtRp(r.nominal_iuran)}</TableCell>
                  <TableCell>{r.tanggal_administrasi ? new Date(r.tanggal_administrasi).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DetailDialog row={r} />
                      {isAdmin && <EditDialog row={r} onSaved={onSaved} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
