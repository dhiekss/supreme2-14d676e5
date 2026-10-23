import { useState, useRef, useEffect } from "react";
import { queryOptions, useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Eye, Trash2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";
import { supabase } from "@/integrations/supabase/client";
import { todayWIB } from "@/lib/wib";
import { listGuruForAgenda, listJadwalAgenda } from "@/lib/agenda-guru.functions";
import { pjjClassSlots, matchesPjjSchedule } from "@/lib/pjj-schedule";
import { pjjOptions, pjjStudents, listPjj, pjjDetail, savePjj, deletePjj } from "@/lib/pjj.functions";

export const pjjOptionsQO = queryOptions({ queryKey: ["pjj-options"], queryFn: () => pjjOptions() });
export const pjjListQO = (recap: boolean, page = 1, from = "", to = "", rombelId = "") => queryOptions({ queryKey: ["pjj-list", recap, page, from, to, rombelId], queryFn: () => listPjj({ data: { recap, page, from, to, rombelId } }) });
type Detail = Awaited<ReturnType<typeof pjjDetail>>;
type Student = { id: string; name: string; nis: string | null };
function activeStudents(value: unknown): Student[] {
  if (!Array.isArray(value)) return [];
  return value.filter((s): s is Student => s !== null && typeof s === "object" && typeof s.id === "string" && typeof s.name === "string");
}
function photoUrl(url: string) {
  if (!url) return "";
  const parsed = new URL(url);
  return `${import.meta.env.VITE_SUPABASE_URL}${parsed.pathname}${parsed.search}`;
}
function dateLabel(date: string) { return new Date(`${date}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }); }

export function PjjPage() {
  const { data: options } = useSuspenseQuery(pjjOptionsQO);
  const [tab, setTab] = useState("input");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rombelId, setRombelId] = useState("all");
  const list = useQuery(pjjListQO(tab === "rekap", page, from, to, rombelId === "all" ? "" : rombelId));
  const [editor, setEditor] = useState<{ detail?: Detail } | null>(null);
  const [view, setView] = useState<Detail | null>(null);
  const [loadingId, setLoadingId] = useState("");
  const [removeId, setRemoveId] = useState("");
  const detailFn = useServerFn(pjjDetail);
  const deleteFn = useServerFn(deletePjj);
  const qc = useQueryClient();
  const remove = useMutation({ mutationFn: () => deleteFn({ data: { id: removeId } }), onSuccess: () => { setRemoveId(""); toast.success("Laporan PJJ dihapus"); void qc.invalidateQueries({ queryKey: ["pjj-list"] }); }, onError: (e: Error) => toast.error(e.message) });
  const open = async (id: string, edit: boolean) => {
    setLoadingId(id);
    try { const detail = await detailFn({ data: { id } }); if (edit) setEditor({ detail }); else setView(detail); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Gagal membaca laporan"); }
    finally { setLoadingId(""); }
  };
  return <div className="space-y-6 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">PJJ</h1>{tab === "input" && <Button onClick={() => setEditor({})}><Plus className="h-4 w-4 mr-2" />Isi Laporan PJJ</Button>}</div>
    <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); }}><TabsList className="h-auto flex-wrap"><TabsTrigger value="input">Isian Laporan PJJ</TabsTrigger><TabsTrigger value="rekap">Rekap Laporan PJJ</TabsTrigger></TabsList></Tabs>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1"><Label htmlFor="pjj-from">Dari tanggal</Label><Input id="pjj-from" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div>
      <div className="space-y-1"><Label htmlFor="pjj-to">Sampai tanggal</Label><Input id="pjj-to" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }} /></div>
      <div className="space-y-1"><Label>Rombel</Label><Select value={rombelId} onValueChange={v => { setRombelId(v); setPage(1); }}><SelectTrigger aria-label="Filter rombel"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua Rombel</SelectItem>{options.rombel.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="rounded-md border overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Tanggal</TableHead>{tab === "rekap" && <TableHead>Pelapor</TableHead>}<TableHead>Rombel</TableHead><TableHead>Mata Pelajaran</TableHead><TableHead>Jam</TableHead><TableHead>Murid Aktif</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>
      {list.data?.rows.map(r => <TableRow key={r.id}><TableCell className="whitespace-nowrap">{dateLabel(r.tanggal)}</TableCell>{tab === "rekap" && <TableCell>{r.owner_name}</TableCell>}<TableCell>{r.rombel?.name}</TableCell><TableCell>{r.mapel?.nama}</TableCell><TableCell>{r.jam_list.join(", ")}</TableCell><TableCell>{activeStudents(r.murid_aktif).length}</TableCell><TableCell><div className="flex gap-1">
        <Button variant="ghost" size="icon" aria-label="Lihat laporan" title="Lihat laporan" disabled={loadingId === r.id} onClick={() => void open(r.id, false)}><Eye className="h-4 w-4" /></Button>
        {tab === "input" && <><Button variant="ghost" size="icon" aria-label="Ubah laporan" title="Ubah laporan" disabled={loadingId === r.id} onClick={() => void open(r.id, true)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Hapus laporan" title="Hapus laporan" onClick={() => setRemoveId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></>}
      </div></TableCell></TableRow>)}
      {(list.isPending || list.isError || !list.data?.rows.length) && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">{list.isPending ? "Memuat…" : list.isError ? "Gagal membaca laporan PJJ" : "Belum ada laporan PJJ"}</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>{list.data?.count ?? 0} laporan</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p-1)}>Sebelumnya</Button><span>{page} / {Math.max(1, Math.ceil((list.data?.count ?? 0)/20))}</span><Button variant="outline" disabled={page * 20 >= (list.data?.count ?? 0)} onClick={() => setPage(p => p+1)}>Berikutnya</Button></div></div>
    {editor && <PjjEditor detail={editor.detail} options={options} onClose={() => setEditor(null)} />}
    <Dialog open={!!view} onOpenChange={v => { if (!v) setView(null); }}><DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Detail Laporan PJJ</DialogTitle><DialogDescription>{view ? `${dateLabel(view.tanggal)} · ${view.rombel?.name} · ${view.mapel?.nama}` : ""}</DialogDescription></DialogHeader>{view && <div className="space-y-5"><div><Label>Jam Pelajaran</Label><p>{view.jam_list.join(", ")}</p></div><div><Label>Tujuan Pembelajaran</Label><p className="whitespace-pre-wrap">{view.tujuan_pembelajaran || "—"}</p></div><div><Label>Materi / Instruksi Tugas</Label><p className="whitespace-pre-wrap">{view.materi}</p></div><div><h3 className="font-semibold">Murid Aktif ({activeStudents(view.murid_aktif).length})</h3><div className="max-h-64 overflow-y-auto mt-2 divide-y">{activeStudents(view.murid_aktif).map(s => <div key={s.id} className="py-2 text-sm">{s.name} <span className="text-muted-foreground">{s.nis}</span></div>)}</div></div><div className="grid sm:grid-cols-2 gap-4"><div><Label>Bukti Instruksi Tugas</Label><img className="mt-2 w-full max-h-80 object-contain rounded-md border" src={photoUrl(view.instruksi_url)} alt="Bukti instruksi tugas" /></div><div><Label>Bukti Tugas Terkumpul</Label><img className="mt-2 w-full max-h-80 object-contain rounded-md border" src={photoUrl(view.terkumpul_url)} alt="Bukti tugas terkumpul" /></div></div>{view.ttd_guru && <div><Label>Tanda Tangan</Label><img src={view.ttd_guru} alt="Tanda tangan pelapor" className="max-h-40 object-contain" /></div>}</div>}</DialogContent></Dialog>
    <Dialog open={!!removeId} onOpenChange={v => { if (!v) setRemoveId(""); }}><DialogContent><DialogHeader><DialogTitle>Hapus laporan PJJ?</DialogTitle><DialogDescription>Laporan ini akan dihapus dari isian dan rekap PJJ.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setRemoveId("")}>Batal</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>Hapus</Button></div></DialogContent></Dialog>
  </div>;
}

function PjjEditor({ detail, options, onClose }: { detail?: Detail; options: Awaited<ReturnType<typeof pjjOptions>>; onClose: () => void }) {
  const [tanggal, setTanggal] = useState(detail?.tanggal ?? todayWIB());
  const [guruId, setGuruId] = useState("");
  const [rombel, setRombel] = useState(detail?.rombel_id ?? "");
  const [mapel, setMapel] = useState(detail?.mata_pelajaran_id ?? "");
  const [jam, setJam] = useState<number[]>(detail?.jam_list ?? []);
  const [tujuan, setTujuan] = useState(detail?.tujuan_pembelajaran ?? "");
  const [materi, setMateri] = useState(detail?.materi ?? "");
  const [selected, setSelected] = useState<string[]>(activeStudents(detail?.murid_aktif).map(s => s.id));
  const [search, setSearch] = useState("");
  const [instruksi, setInstruksi] = useState<File | null>(null);
  const [terkumpul, setTerkumpul] = useState<File | null>(null);
  const sig = useRef<SignaturePadHandle>(null);
  const teachersFn = useServerFn(listGuruForAgenda);
  const scheduleFn = useServerFn(listJadwalAgenda);
  const teachers = useQuery({ queryKey: ["agenda-guru-list"], queryFn: () => teachersFn() });
  useEffect(() => { if (!guruId && teachers.data?.rows.length === 1) setGuruId(teachers.data.rows[0].id); }, [guruId, teachers.data]);
  const schedule = useQuery({ queryKey: ["agenda-jadwal", guruId, tanggal], queryFn: () => scheduleFn({ data: { guruId, tanggal } }), enabled: !!guruId && !!tanggal });
  const slots = pjjClassSlots(schedule.data ?? []);
  const validSlot = matchesPjjSchedule(slots, rombel, mapel, jam);
  const resetSlot = () => { setRombel(""); setMapel(""); setJam([]); setSelected([]); };
  const studentsFn = useServerFn(pjjStudents);
  const students = useQuery({ queryKey: ["pjj-students", rombel], queryFn: () => studentsFn({ data: { rombelId: rombel } }), enabled: !!rombel });
  const saveFn = useServerFn(savePjj);
  const qc = useQueryClient();
  const save = useMutation({ mutationFn: async () => {
    if (!validSlot) throw new Error("Pilih kelas dari jadwal mengajar pada tanggal ini");
    if (!tanggal || !rombel || !mapel || !jam.length || !materi.trim()) throw new Error("Lengkapi tanggal, rombel, mata pelajaran, jam, dan materi");
    if ((!instruksi && !detail?.bukti_instruksi_path) || (!terkumpul && !detail?.bukti_terkumpul_path)) throw new Error("Unggah kedua bukti foto");
    const uploaded: string[] = [];
    const upload = async (file: File | null, previous?: string) => {
      if (!file) return previous ?? "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Foto harus JPG, PNG, atau WebP, maksimal 5 MB");
      const path = `${options.userId}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      const result = await supabase.storage.from("pjj-bukti").upload(path, file, { contentType: file.type });
      if (result.error) throw new Error("Gagal mengunggah bukti foto");
      uploaded.push(path);
      return path;
    };
    try {
      const instruksiPath = await upload(instruksi, detail?.bukti_instruksi_path);
      const terkumpulPath = await upload(terkumpul, detail?.bukti_terkumpul_path);
      return await saveFn({ data: { id: detail?.id, tanggal, guruId, rombelId: rombel, mapelId: mapel, jamList: jam, tujuan, materi, muridIds: selected, instruksiPath, terkumpulPath, ttd: sig.current && !sig.current.isEmpty() ? sig.current.toDataURL() : detail?.ttd_guru ?? "" } });
    } catch(e) { if (uploaded.length) await supabase.storage.from("pjj-bukti").remove(uploaded); throw e; }
  }, onSuccess: () => { toast.success("Laporan PJJ tersimpan"); void qc.invalidateQueries({ queryKey: ["pjj-list"] }); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  const visibleStudents = (students.data ?? []).filter(s => `${s.name} ${s.nis ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <Dialog open onOpenChange={v => { if (!v && !save.isPending) onClose(); }}><DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{detail ? "Ubah" : "Isi"} Laporan PJJ</DialogTitle><DialogDescription>{options.nama}</DialogDescription></DialogHeader>
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Pilih Guru</Label><Select value={guruId} onValueChange={v => { setGuruId(v); resetSlot(); }}><SelectTrigger aria-label="Guru laporan PJJ"><SelectValue placeholder="Pilih guru" /></SelectTrigger><SelectContent>{teachers.data?.rows.map(g => <SelectItem key={g.id} value={g.id}>{g.nama}{g.nip ? ` (${g.nip})` : ""}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="pjj-date">Tanggal Pengisian</Label><Input id="pjj-date" type="date" required value={tanggal} onChange={e => { setTanggal(e.target.value); resetSlot(); }} /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {slots.map((slot, index) => <div key={`${slot.rombel_id}-${slot.mata_pelajaran_id}-${index}`} className="border rounded-md p-4 space-y-3">
          <p className="font-semibold">Jam ke-{slot.jam_list.join(", ")}</p>
          <p className="text-sm text-muted-foreground">{slot.jam_mulai} – {slot.jam_selesai}</p>
          <div><Label>Kelas</Label><p>{String(slot.rombel_name)}</p></div>
          <div><Label>Mata Pelajaran</Label><p>{String(slot.mapel_nama)}</p></div>
          <Button type="button" variant={slot.rombel_id === rombel && slot.mata_pelajaran_id === mapel && slot.jam_list.length === jam.length && slot.jam_list.every((j: number) => jam.includes(j)) ? "default" : "outline"} className="w-full" onClick={() => { if (!slot.rombel_id || !slot.mata_pelajaran_id) return; setRombel(slot.rombel_id); setMapel(slot.mata_pelajaran_id); setJam(slot.jam_list); setSelected([]); }}>Pilih Kelas</Button>
        </div>)}
      </div>
      {!slots.length && <p className="text-sm text-muted-foreground">{schedule.isFetching || teachers.isPending ? "Memuat jadwal…" : schedule.isError || teachers.isError ? "Gagal membaca jadwal guru" : !guruId ? "Pilih guru" : "Tidak ada jadwal mengajar pada hari ini"}</p>}
      <div className="space-y-2"><Label htmlFor="pjj-tujuan">Tujuan Pembelajaran</Label><Textarea id="pjj-tujuan" value={tujuan} maxLength={2000} onChange={e => setTujuan(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="pjj-materi">Materi / Instruksi Tugas</Label><Textarea id="pjj-materi" required value={materi} maxLength={4000} rows={4} onChange={e => setMateri(e.target.value)} /></div>
      <section className="space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <h3 className="font-semibold">Murid yang Aktif Mengikuti PJJ ({selected.length})</h3>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox aria-label="Pilih semua murid" disabled={!students.data?.length} checked={!!students.data?.length && students.data.every(s => selected.includes(s.id)) ? true : selected.length ? "indeterminate" : false} onCheckedChange={v => setSelected(v === true ? (students.data ?? []).map(s => s.id) : [])} />Semua aktif
          </label>
        </div>
        <Input aria-label="Cari murid" placeholder="Cari nama / NIS" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="border rounded-md max-h-64 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted z-10">
              <TableRow><TableHead className="w-12">No</TableHead><TableHead>Nama Murid</TableHead><TableHead>NIS</TableHead><TableHead className="w-20 text-center">Aktif</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {visibleStudents.map((s, i) => <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium uppercase"><label htmlFor={`pjj-active-${s.id}`} className="cursor-pointer">{s.name}</label></TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{s.nis ?? "—"}</TableCell>
                <TableCell className="text-center"><Checkbox id={`pjj-active-${s.id}`} aria-label={`Aktif ${s.name}`} checked={selected.includes(s.id)} onCheckedChange={v => setSelected(prev => v === true ? [...new Set([...prev, s.id])] : prev.filter(id => id !== s.id))} /></TableCell>
              </TableRow>)}
              {!visibleStudents.length && <TableRow><TableCell colSpan={4} className="p-5 text-muted-foreground text-center">{students.isFetching ? "Memuat murid…" : students.isError ? "Gagal membaca murid" : rombel ? "Tidak ada murid" : "Pilih rombel"}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
      <div className="grid sm:grid-cols-2 gap-4"><PhotoField id="pjj-instruksi" label="Bukti Instruksi Tugas" file={instruksi} url={detail?.instruksi_url} onChange={setInstruksi} /><PhotoField id="pjj-terkumpul" label="Bukti Tugas Terkumpul" file={terkumpul} url={detail?.terkumpul_url} onChange={setTerkumpul} /></div>
      <div className="space-y-2"><Label>Tanda Tangan</Label>{detail?.ttd_guru && <img src={detail.ttd_guru} alt="Tanda tangan tersimpan" className="max-h-24" />}<SignaturePad ref={sig} className="h-40 border rounded-md" /><Button type="button" variant="outline" size="sm" onClick={() => sig.current?.clear()}>Bersihkan</Button></div>
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Batal</Button><Button type="submit" disabled={save.isPending || schedule.isFetching || !validSlot || students.isFetching || students.isError}><Save className="h-4 w-4 mr-2" />{save.isPending ? "Menyimpan…" : "Simpan Laporan"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}

function PhotoField({ id, label, file, url, onChange }: { id: string; label: string; file: File | null; url?: string; onChange: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => {
    const next = e.target.files?.[0] ?? null;
    if (next && (!next.type.startsWith("image/") || next.size > 5*1024*1024)) { toast.error("Foto maksimal 5 MB"); return; }
    onChange(next);
    if (next) { const reader = new FileReader(); reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(next); } else setPreview("");
  }} /><Button type="button" variant="outline" className="w-full" onClick={() => input.current?.click()}><Upload className="h-4 w-4 mr-2" />{file || url ? "Ganti Foto" : "Unggah Foto"}</Button>{file && <p className="text-xs text-muted-foreground break-all">{file.name}</p>}{(preview || url) && <img src={preview || photoUrl(url ?? "")} alt={label} className="w-full h-48 object-contain border rounded-md" />}</div>;
}