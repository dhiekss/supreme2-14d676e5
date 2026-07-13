import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Download, FileText, Users, Loader2 } from "lucide-react";
import { listRombel } from "@/lib/presensi.functions";
import { monthlyAttendanceData } from "@/lib/daftar-hadir.functions";
import { exportDaftarHadirPdf } from "@/lib/daftar-hadir-pdf";

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function years() {
  const y = new Date().getFullYear();
  const out: number[] = [];
  for (let i = y - 3; i <= y + 2; i++) out.push(i);
  return out;
}

export function DaftarHadirExportCards() {
  return (
    <div className="space-y-4">
      <MultiRombelCard />
      <PerRombelCard />
    </div>
  );
}

function MultiRombelCard() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [tab, setTab] = useState<string>("manual");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selKonsen, setSelKonsen] = useState<string>("");
  const [selTingkat, setSelTingkat] = useState<string>("");
  const [loading, setLoading] = useState<"rekap" | "kosong" | null>(null);

  const fetchRombel = useServerFn(listRombel);
  const fetchData = useServerFn(monthlyAttendanceData);
  const rombelQ = useQuery({ queryKey: ["rombel-all-daftar-hadir"], queryFn: () => fetchRombel() });
  const rombels = rombelQ.data ?? [];

  const konsenList = useMemo(() => Array.from(new Set(rombels.map((r: any) => r.konsentrasi_keahlian).filter(Boolean))) as string[], [rombels]);
  const tingkatList = useMemo(() => Array.from(new Set(rombels.map((r: any) => r.tingkat).filter(Boolean))) as string[], [rombels]);

  const effectiveIds = useMemo(() => {
    if (tab === "manual") return Array.from(selected);
    if (tab === "semua") return rombels.map((r: any) => r.id);
    if (tab === "konsentrasi") return rombels.filter((r: any) => r.konsentrasi_keahlian === selKonsen).map((r: any) => r.id);
    if (tab === "tingkat") return rombels.filter((r: any) => r.tingkat === selTingkat).map((r: any) => r.id);
    return [];
  }, [tab, selected, selKonsen, selTingkat, rombels]);

  const toggleAll = () => {
    if (selected.size === rombels.length) setSelected(new Set());
    else setSelected(new Set(rombels.map((r: any) => r.id)));
  };

  const doExport = async (kosong: boolean) => {
    if (effectiveIds.length === 0) {
      toast.error("Pilih minimal satu rombel");
      return;
    }
    setLoading(kosong ? "kosong" : "rekap");
    const tId = toast.loading(`Menyiapkan PDF ${kosong ? "kosong" : "rekap"} (${effectiveIds.length} rombel)...`);
    try {
      const data: any = await fetchData({ data: { month, year, rombelIds: effectiveIds } });
      await exportDaftarHadirPdf(data, { kosong });
      toast.success("PDF berhasil diekspor", { id: tId });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal ekspor PDF", { id: tId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Ekspor PDF Multi Rombel (Admin)
        </CardTitle>
        <p className="text-xs text-muted-foreground">Ekspor daftar hadir murid bulanan untuk beberapa rombel sekaligus</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Pilih Bulan</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BULAN_ID.map((b, i) => <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pilih Tahun</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Pilih Rombel</Label>
            <Badge variant="secondary">{effectiveIds.length} dari {rombels.length} rombel dipilih</Badge>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="semua">Semua</TabsTrigger>
              <TabsTrigger value="konsentrasi">Konsentrasi</TabsTrigger>
              <TabsTrigger value="tingkat">Tingkat</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Pilih rombel secara manual</span>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={toggleAll}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  {selected.size === rombels.length && rombels.length > 0 ? "Batal Pilih" : "Pilih Semua"}
                </Button>
              </div>
              <div className="max-h-[280px] overflow-y-auto rounded-md border bg-background p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-1.5 gap-x-2">
                  {rombels.map((r: any) => {
                    const on = selected.has(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(selected);
                          if (on) next.delete(r.id); else next.add(r.id);
                          setSelected(next);
                        }}
                        className="flex items-center gap-2 text-left text-xs px-1 py-1 rounded hover:bg-muted"
                      >
                        <span className={`inline-block h-4 w-4 rounded-full border ${on ? "bg-primary border-primary" : "border-muted-foreground/40"} flex items-center justify-center`}>
                          {on && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                        </span>
                        <span className="truncate">{r.name}</span>
                      </button>
                    );
                  })}
                  {rombels.length === 0 && <div className="text-xs text-muted-foreground col-span-full">Belum ada rombel.</div>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="semua" className="mt-3">
              <div className="text-xs text-muted-foreground rounded-md border bg-background p-3">
                Semua rombel ({rombels.length}) akan diekspor.
              </div>
            </TabsContent>

            <TabsContent value="konsentrasi" className="mt-3 space-y-2">
              <Select value={selKonsen} onValueChange={setSelKonsen}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih konsentrasi keahlian" /></SelectTrigger>
                <SelectContent>
                  {konsenList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="tingkat" className="mt-3 space-y-2">
              <Select value={selTingkat} onValueChange={setSelTingkat}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                <SelectContent>
                  {tingkatList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => doExport(false)} disabled={loading !== null || effectiveIds.length === 0} className="gap-2">
            {loading === "rekap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Ekspor PDF Rekap Bulanan ({effectiveIds.length})
          </Button>
          <Button variant="outline" onClick={() => doExport(true)} disabled={loading !== null || effectiveIds.length === 0} className="gap-2">
            <FileText className="h-4 w-4" /> Ekspor PDF Kosong ({effectiveIds.length})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PerRombelCard() {
  const now = new Date();
  const [rombelId, setRombelId] = useState<string>("");
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [wali, setWali] = useState<string>("");
  const [nip, setNip] = useState<string>("");
  const [loading, setLoading] = useState<"rekap" | "kosong" | null>(null);

  const fetchRombel = useServerFn(listRombel);
  const fetchData = useServerFn(monthlyAttendanceData);
  const rombelQ = useQuery({ queryKey: ["rombel-all-daftar-hadir"], queryFn: () => fetchRombel() });
  const rombels = rombelQ.data ?? [];

  const doExport = async (kosong: boolean) => {
    if (!rombelId) {
      toast.error("Pilih rombel");
      return;
    }
    setLoading(kosong ? "kosong" : "rekap");
    const tId = toast.loading("Menyiapkan PDF...");
    try {
      const data: any = await fetchData({ data: { month, year, rombelIds: [rombelId] } });
      await exportDaftarHadirPdf(data, {
        kosong,
        overrideWaliName: wali.trim() || null,
        overrideWaliNip: nip.trim() || null,
      });
      toast.success("PDF berhasil diekspor", { id: tId });
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal ekspor PDF", { id: tId });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Rekap Bulanan Per Rombel
        </CardTitle>
        <p className="text-xs text-muted-foreground">Ekspor daftar hadir murid bulanan dalam format PDF</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Pilih Rombel</Label>
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pilih rombel..." /></SelectTrigger>
              <SelectContent>
                {rombels.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pilih Bulan</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BULAN_ID.map((b, i) => <SelectItem key={i} value={String(i + 1)}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Pilih Tahun</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nama Wali Kelas</Label>
            <Input value={wali} onChange={(e) => setWali(e.target.value)} placeholder="Nama Wali Kelas" className="h-9" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs">NIP Wali Kelas</Label>
            <Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="NIP Wali Kelas" className="h-9" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => doExport(false)} disabled={loading !== null || !rombelId} className="gap-2">
            {loading === "rekap" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Ekspor PDF Rekap Bulanan
          </Button>
          <Button variant="outline" onClick={() => doExport(true)} disabled={loading !== null || !rombelId} className="gap-2">
            <FileText className="h-4 w-4" /> Ekspor PDF Kosong (Manual)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
