import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ChevronsUpDown, History, Pencil, Search, Users, X } from "lucide-react";
import { listAllStudents, listStudentIdentityLogs, saveStudent } from "@/lib/rombel-members.functions";
import { listRombel } from "@/lib/sekolah.functions";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string | null;
  nis: string | null;
  nisn: string | null;
  gender: string | null;
  rombel_id: string | null;
  rombel_nama?: string | null;
  wali_kelas_name?: string | null;
  tingkat?: string | null;
  konsentrasi_keahlian?: string | null;
};

type SortKey = "name" | "gender" | "nis" | "nisn" | "rombel_nama" | "tingkat" | "konsentrasi_keahlian" | "wali_kelas_name";


export const Route = createFileRoute("/_authenticated/murid")({
  head: () => ({
    meta: [
      { title: "Manajemen Murid — SUPREME XPOES" },
      { name: "description", content: "Data seluruh murid yang terdaftar di semua rombel beserta identitasnya." },
      { property: "og:title", content: "Manajemen Murid — SUPREME XPOES" },
      { property: "og:description", content: "Kelola identitas murid: nama, NIS, NISN, jenis kelamin, dan rombel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAllStudents);
  const rombelFn = useServerFn(listRombel);
  const saveFn = useServerFn(saveStudent);

  const { data = [], isLoading } = useQuery({ queryKey: ["murid-all"], queryFn: () => fetchFn() as Promise<Row[]> });
  const { data: rombels = [] } = useQuery({ queryKey: ["rombel-list"], queryFn: () => rombelFn({ data: {} }) as Promise<any[]> });

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [limit, setLimit] = useState(100);
  const [rombelFilter, setRombelFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [tingkatFilter, setTingkatFilter] = useState("all");
  const [konsentrasiFilter, setKonsentrasiFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [history, setHistory] = useState<Partial<Row> | null>(null);

  const save = useMutation({
    mutationFn: (v: any) => saveFn({ data: v }),
    onSuccess: () => {
      toast.success("Data murid tersimpan");
      qc.invalidateQueries({ queryKey: ["murid-all"] });
      qc.invalidateQueries({ queryKey: ["murid-logs"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const tingkatOptions = useMemo(
    () => Array.from(new Set((rombels ?? []).map((r: any) => r.tingkat).filter(Boolean))).sort() as string[],
    [rombels],
  );
  const konsentrasiOptions = useMemo(
    () => Array.from(new Set((rombels ?? []).map((r: any) => r.konsentrasi_keahlian).filter(Boolean))).sort() as string[],
    [rombels],
  );

  const filteredRombels = useMemo(
    () =>
      (rombels ?? []).filter((r: any) => {
        if (tingkatFilter !== "all" && (r.tingkat ?? "") !== tingkatFilter) return false;
        if (konsentrasiFilter !== "all" && (r.konsentrasi_keahlian ?? "") !== konsentrasiFilter) return false;
        return true;
      }),
    [rombels, tingkatFilter, konsentrasiFilter],
  );

  const rows = useMemo(() => {
    const norm = (v: unknown) =>
      String(v ?? "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const terms = norm(deferredQ).split(" ").filter(Boolean);
    const out = (data ?? []).filter((r) => {
      if (rombelFilter !== "all" && r.rombel_id !== rombelFilter) return false;
      if (genderFilter !== "all" && (r.gender ?? "") !== genderFilter) return false;
      if (tingkatFilter !== "all" && (r.tingkat ?? "") !== tingkatFilter) return false;
      if (konsentrasiFilter !== "all" && (r.konsentrasi_keahlian ?? "") !== konsentrasiFilter) return false;
      if (!terms.length) return true;
      const hay = [r.name, r.nis, r.nisn, r.rombel_nama, r.tingkat, r.konsentrasi_keahlian, r.wali_kelas_name]
        .map(norm)
        .join(" ");
      return terms.every((t) => hay.includes(t));
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = String(a[sort.key] ?? "");
      const bv = String(b[sort.key] ?? "");
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      return av.localeCompare(bv, "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [data, deferredQ, rombelFilter, genderFilter, tingkatFilter, konsentrasiFilter, sort]);

  useEffect(() => {
    setLimit(100);
  }, [deferredQ, rombelFilter, genderFilter, tingkatFilter, konsentrasiFilter]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const SortHead = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {sort.key === sortKey ? (
          sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );

  const hasFilter =
    q.trim() !== "" ||
    [rombelFilter, genderFilter, tingkatFilter, konsentrasiFilter].some((v) => v !== "all");

  const resetFilters = () => {
    setQ("");
    setRombelFilter("all");
    setGenderFilter("all");
    setTingkatFilter("all");
    setKonsentrasiFilter("all");
  };

  const totalL = rows.filter((r) => r.gender === "L").length;
  const totalP = rows.filter((r) => r.gender === "P").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Murid</h1>
        <p className="text-sm text-muted-foreground">Seluruh murid yang terdaftar di semua rombel beserta identitasnya.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Murid" value={rows.length} />
        <StatCard title="Laki-laki" value={totalL} />
        <StatCard title="Perempuan" value={totalP} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Daftar Murid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama / NIS / NISN / rombel / konsentrasi…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={tingkatFilter} onValueChange={(v) => { setTingkatFilter(v); setRombelFilter("all"); }}>
                <SelectTrigger><SelectValue placeholder="Semua Tingkat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tingkat</SelectItem>
                  {tingkatOptions.map((t) => (<SelectItem key={t} value={t}>Tingkat {t}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={konsentrasiFilter} onValueChange={(v) => { setKonsentrasiFilter(v); setRombelFilter("all"); }}>
                <SelectTrigger><SelectValue placeholder="Semua Konsentrasi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Konsentrasi</SelectItem>
                  {konsentrasiOptions.map((k) => (<SelectItem key={k} value={k}>{k}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={rombelFilter} onValueChange={setRombelFilter}>
                <SelectTrigger><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Rombel</SelectItem>
                  {filteredRombels.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger><SelectValue placeholder="Semua JK" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua JK</SelectItem>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilter && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{rows.length} murid cocok dengan filter.</p>
                <Button size="sm" variant="ghost" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5 mr-1" /> Reset filter
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <SortHead label="Nama Murid" sortKey="name" />
                  <SortHead label="JK" sortKey="gender" />
                  <SortHead label="NIS" sortKey="nis" />
                  <SortHead label="NISN" sortKey="nisn" />
                  <SortHead label="Tingkat" sortKey="tingkat" />
                  <SortHead label="Konsentrasi" sortKey="konsentrasi_keahlian" />
                  <SortHead label="Rombel" sortKey="rombel_nama" />
                  <SortHead label="Wali Kelas" sortKey="wali_kelas_name" />
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Memuat…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Tidak ada data murid.</TableCell></TableRow>
                ) : (
                  rows.slice(0, limit).map((r, i) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                      <TableCell>{r.gender ? <Badge variant="secondary">{r.gender}</Badge> : "—"}</TableCell>
                      <TableCell>{r.nis ?? "—"}</TableCell>
                      <TableCell>{r.nisn ?? "—"}</TableCell>
                      <TableCell>{r.tingkat ?? "—"}</TableCell>
                      <TableCell>{r.konsentrasi_keahlian ?? "—"}</TableCell>
                      <TableCell>{r.rombel_nama ?? "—"}</TableCell>
                      <TableCell>{r.wali_kelas_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setHistory(r)}>
                            <History className="h-3.5 w-3.5 mr-1" /> Riwayat
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {rows.length > limit && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Menampilkan {limit} dari {rows.length} murid.</p>
              <Button size="sm" variant="outline" onClick={() => setLimit((n) => n + 200)}>Tampilkan lebih banyak</Button>
            </div>
          )}

        </CardContent>
      </Card>

      <EditDialog
        row={editing}
        onClose={() => setEditing(null)}
        onSave={(v) => save.mutate(v)}
        saving={save.isPending}
      />

      <HistoryDialog row={history} onClose={() => setHistory(null)} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function EditDialog({
  row, onClose, onSave, saving,
}: {
  row: Partial<Row> | null;
  onClose: () => void;
  onSave: (v: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<Row>>({});
  const key = row?.id ?? "none";

  useMemo(() => { setForm(row ?? {}); }, [key]);

  const submit = () => {
    if (!String(form.name ?? "").trim()) { toast.error("Nama murid wajib diisi"); return; }
    onSave({
      id: form.id,
      name: String(form.name).trim(),
      nis: form.nis || null,
      nisn: form.nisn || null,
      gender: form.gender || null,
    });
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader><DialogTitle>Edit Identitas Murid</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama Murid</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>NIS</Label>
              <Input value={form.nis ?? ""} onChange={(e) => setForm((f) => ({ ...f, nis: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>NISN</Label>
              <Input value={form.nisn ?? ""} onChange={(e) => setForm((f) => ({ ...f, nisn: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select value={form.gender ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rombel</Label>
              <div className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm items-center text-muted-foreground">
                {row?.rombel_nama ?? "—"}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FIELD_LABEL: Record<string, string> = {
  name: "Nama",
  nis: "NIS",
  nisn: "NISN",
  gender: "Jenis Kelamin",
};

function HistoryDialog({ row, onClose }: { row: Partial<Row> | null; onClose: () => void }) {
  const logsFn = useServerFn(listStudentIdentityLogs);
  const { data = [], isLoading } = useQuery({
    queryKey: ["murid-logs", row?.id],
    queryFn: () => logsFn({ data: { student_id: row!.id as string } }) as Promise<any[]>,
    enabled: !!row?.id,
  });

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Riwayat Perubahan Identitas — {row?.name ?? "—"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Memuat…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada perubahan identitas tercatat.</p>
          ) : (
            data.map((log) => (
              <div key={log.id} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {log.changed_by_name || log.changed_by_email || "Pengguna tidak dikenal"}
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleString("id-ID", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {(Array.isArray(log.changes) ? log.changes : []).map((c: any, i: number) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{FIELD_LABEL[c.field] ?? c.field}</Badge>
                      <span className="text-muted-foreground line-through">{c.from ?? "—"}</span>
                      <span aria-hidden>→</span>
                      <span className="font-medium">{c.to ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
