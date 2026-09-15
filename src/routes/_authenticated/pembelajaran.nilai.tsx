import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import * as XLSX from "xlsx";
import { Award, BookOpen, Copy, FileSpreadsheet, Heart, Pencil, Plus, Save, Settings2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  copyNilaiObjectives,
  deleteNilaiObjective,
  getNilaiWorkspace,
  listNilaiAssignments,
  saveNilaiObjective,
  saveNilaiWeights,
  saveStudentGrades,
  setSikapEnabled,
} from "@/lib/nilai.functions";

type Assignment = {
  id: string; rombel_id: string; mata_pelajaran_id: string; guru_id: string;
  rombel_name: string; mapel_name: string; mapel_code: string | null; guru_name: string; guru_nip: string | null;
};
type Objective = {
  id: string; kode_tp: string | null; deskripsi: string | null; model_penilaian: string | null;
  komponen_type: "tp" | "final_test" | "sikap" | null; bobot: number | null;
  tanggal_rencana_penilaian: string | null; is_active: boolean | null; urutan: number | null;
};
type Workspace = {
  students: { id: string; name: string | null; nis: string | null }[];
  objectives: Objective[];
  grades: { id: string; tujuan_pembelajaran_id: string | null; student_id: string | null; nilai: number | null }[];
};
type ObjectiveForm = {
  id?: string; kode_tp: string; deskripsi: string; model_penilaian: "tes_tertulis" | "praktik" | "portofolio" | "proyek" | "observasi";
  komponen_type: "tp" | "final_test"; bobot: number; tanggal_rencana_penilaian: string;
};

const EMPTY_FORM: ObjectiveForm = { kode_tp: "", deskripsi: "", model_penilaian: "tes_tertulis", komponen_type: "tp", bobot: 0, tanggal_rencana_penilaian: "" };
const MODEL_LABEL: Record<string, string> = { tes_tertulis: "Tes Tertulis", praktik: "Praktik", portofolio: "Portofolio", proyek: "Proyek", observasi: "Observasi" };

export const Route = createFileRoute("/_authenticated/pembelajaran/nilai")({
  head: () => ({ meta: [
    { title: "Pengelolaan Nilai — SUPREME XPOES" },
    { name: "description", content: "Kelola tujuan pembelajaran, input nilai, final test, dan rekap nilai murid." },
    { property: "og:title", content: "Pengelolaan Nilai — SUPREME XPOES" },
    { property: "og:description", content: "Kelola tujuan pembelajaran, input nilai, final test, dan rekap nilai murid." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PengelolaanNilaiPage,
});

function PengelolaanNilaiPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNilaiAssignments);
  const workspaceFn = useServerFn(getNilaiWorkspace);
  const saveObjectiveFn = useServerFn(saveNilaiObjective);
  const deleteObjectiveFn = useServerFn(deleteNilaiObjective);
  const sikapFn = useServerFn(setSikapEnabled);
  const weightFn = useServerFn(saveNilaiWeights);
  const gradeFn = useServerFn(saveStudentGrades);
  const copyFn = useServerFn(copyNilaiObjectives);

  const [rombelId, setRombelId] = useState("");
  const [mapelId, setMapelId] = useState("");
  const [guruId, setGuruId] = useState("");
  const [tab, setTab] = useState("tp");
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [form, setForm] = useState<ObjectiveForm>(EMPTY_FORM);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [draftGrades, setDraftGrades] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: refs, isLoading: refsLoading } = useQuery({ queryKey: ["nilai-assignments"], queryFn: () => listFn() });
  const assignments = (refs?.assignments ?? []) as Assignment[];
  const rombels = useMemo(() => uniqueBy(assignments, "rombel_id"), [assignments]);
  const mapels = useMemo(() => uniqueBy(assignments.filter((x) => x.rombel_id === rombelId), "mata_pelajaran_id"), [assignments, rombelId]);
  const gurus = useMemo(() => uniqueBy(assignments.filter((x) => x.rombel_id === rombelId && x.mata_pelajaran_id === mapelId), "guru_id"), [assignments, rombelId, mapelId]);
  const selected = assignments.find((x) => x.rombel_id === rombelId && x.mata_pelajaran_id === mapelId && x.guru_id === guruId) ?? null;

  useEffect(() => {
    if (!rombelId && rombels[0]) setRombelId(rombels[0].rombel_id);
  }, [rombelId, rombels]);
  useEffect(() => {
    if (!mapels.some((x) => x.mata_pelajaran_id === mapelId)) setMapelId(mapels[0]?.mata_pelajaran_id ?? "");
  }, [mapelId, mapels]);
  useEffect(() => {
    if (!gurus.some((x) => x.guru_id === guruId)) setGuruId(gurus[0]?.guru_id ?? "");
  }, [guruId, gurus]);

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["nilai-workspace", selected?.id],
    queryFn: () => workspaceFn({ data: { assignment_id: selected?.id ?? "" } }),
    enabled: Boolean(selected?.id),
  });
  const ws = workspace as Workspace | undefined;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["nilai-workspace", selected?.id] });

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const g of ws?.grades ?? []) if (g.student_id && g.tujuan_pembelajaran_id && g.nilai !== null) next[`${g.student_id}:${g.tujuan_pembelajaran_id}`] = String(g.nilai);
    setDraftGrades(next);
  }, [ws]);
  useEffect(() => {
    setWeights(Object.fromEntries((ws?.objectives ?? []).filter((x) => x.komponen_type !== "sikap").map((x) => [x.id, Number(x.bobot ?? 0)])));
  }, [ws]);

  const saveObjectiveM = useMutation({
    mutationFn: () => saveObjectiveFn({ data: { ...form, assignment_id: selected?.id ?? "", tanggal_rencana_penilaian: form.tanggal_rencana_penilaian || null } }),
    onSuccess: () => { toast.success(form.id ? "Komponen diperbarui" : "Komponen ditambahkan"); setObjectiveDialog(false); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteObjectiveM = useMutation({
    mutationFn: (id: string) => deleteObjectiveFn({ data: { assignment_id: selected?.id ?? "", id } }),
    onSuccess: () => { toast.success("Komponen dihapus"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const sikapM = useMutation({
    mutationFn: (enabled: boolean) => sikapFn({ data: { assignment_id: selected?.id ?? "", enabled } }),
    onSuccess: () => invalidate(), onError: (e: Error) => toast.error(e.message),
  });
  const weightM = useMutation({
    mutationFn: () => weightFn({ data: { assignment_id: selected?.id ?? "", weights: Object.entries(weights).map(([id, bobot]) => ({ id, bobot })) } }),
    onSuccess: () => { toast.success("Bobot disimpan"); setWeightsOpen(false); invalidate(); }, onError: (e: Error) => toast.error(e.message),
  });
  const gradeM = useMutation({
    mutationFn: () => gradeFn({ data: { assignment_id: selected?.id ?? "", grades: Object.entries(draftGrades).map(([key, value]) => {
      const [student_id, objective_id] = key.split(":");
      return { student_id, objective_id, nilai: value === "" ? null : Number(value) };
    }) } }),
    onSuccess: (r) => { toast.success(`${r.saved} nilai disimpan`); invalidate(); }, onError: (e: Error) => toast.error(e.message),
  });
  const copyM = useMutation({
    mutationFn: () => copyFn({ data: { source_assignment_id: sourceId, target_assignment_id: selected?.id ?? "" } }),
    onSuccess: (r) => { toast.success(`${r.copied} komponen disalin`); setCopyOpen(false); invalidate(); }, onError: (e: Error) => toast.error(e.message),
  });

  const objectives = ws?.objectives ?? [];
  const tpObjectives = objectives.filter((x) => x.komponen_type === "tp");
  const finalObjectives = objectives.filter((x) => x.komponen_type === "final_test");
  const gradingObjectives = objectives.filter((x) => x.komponen_type !== "sikap" && x.is_active !== false);
  const sikap = objectives.find((x) => x.komponen_type === "sikap");
  const totalWeight = gradingObjectives.reduce((sum, x) => sum + Number(weights[x.id] ?? x.bobot ?? 0), 0);
  const contextTitle = selected ? `${selected.rombel_name} - ${selected.mapel_name}` : "Pilih penugasan pembelajaran";

  function openObjective(type: "tp" | "final_test", objective?: Objective) {
    setForm(objective ? {
      id: objective.id, kode_tp: objective.kode_tp ?? "", deskripsi: objective.deskripsi ?? "",
      model_penilaian: (objective.model_penilaian as ObjectiveForm["model_penilaian"]) ?? "tes_tertulis",
      komponen_type: type, bobot: Number(objective.bobot ?? 0), tanggal_rencana_penilaian: objective.tanggal_rencana_penilaian ?? "",
    } : { ...EMPTY_FORM, komponen_type: type, kode_tp: type === "tp" ? `TP${tpObjectives.length + 1}` : `FT${finalObjectives.length + 1}` });
    setObjectiveDialog(true);
  }

  function importGrades(file: File) {
    if (!gradingObjectives.length) return toast.error("Tambahkan komponen penilaian terlebih dahulu");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const studentsByNis = new Map((ws?.students ?? []).map((s) => [String(s.nis ?? "").trim(), s.id]));
        const objectivesByCode = new Map(gradingObjectives.map((o) => [String(o.kode_tp ?? "").trim().toLowerCase(), o.id]));
        const next = { ...draftGrades };
        let imported = 0;
        for (const row of rows) {
          const nis = String(row.NIS ?? row.Nis ?? row.nis ?? "").trim();
          const studentId = studentsByNis.get(nis);
          if (!studentId) continue;
          for (const [header, raw] of Object.entries(row)) {
            const objectiveId = objectivesByCode.get(header.trim().toLowerCase());
            const value = Number(raw);
            if (objectiveId && raw !== "" && Number.isFinite(value) && value >= 0 && value <= 100) {
              next[`${studentId}:${objectiveId}`] = String(value); imported++;
            }
          }
        }
        setDraftGrades(next);
        toast.success(`${imported} nilai dimuat. Klik Simpan Semua untuk menyimpan.`);
      } catch { toast.error("File Excel tidak dapat dibaca"); }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <header className="flex items-start gap-3">
        <Award className="mt-1 h-7 w-7 text-primary" />
        <div><h1 className="text-2xl font-bold">Pengelolaan Nilai</h1><p className="text-sm text-muted-foreground">Kelola tujuan pembelajaran dan input nilai murid</p></div>
      </header>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Filter</CardTitle><p className="text-sm text-muted-foreground">Pilih rombel, mata pelajaran, dan guru untuk mengelola nilai</p></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FilterSelect label="Rombel" value={rombelId} onChange={setRombelId} disabled={refsLoading} items={rombels.map((x) => ({ value: x.rombel_id, label: x.rombel_name }))} />
          <FilterSelect label="Mata Pelajaran" value={mapelId} onChange={setMapelId} disabled={!rombelId} items={mapels.map((x) => ({ value: x.mata_pelajaran_id, label: `${x.mapel_name}${x.mapel_code ? ` (${x.mapel_code})` : ""}` }))} />
          <FilterSelect label="Nama Guru" value={guruId} onChange={setGuruId} disabled={!mapelId} items={gurus.map((x) => ({ value: x.guru_id, label: x.guru_name }))} />
        </CardContent>
      </Card>

      {!refsLoading && assignments.length === 0 ? <EmptyPanel title="Belum ada penugasan pembelajaran" detail="Hubungi admin untuk mengatur rombel, mata pelajaran, guru, dan semester aktif." /> : null}
      {selected ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid h-auto w-full grid-cols-2 md:w-[650px] md:grid-cols-4">
            <TabsTrigger value="tp">Tujuan Pembelajaran</TabsTrigger><TabsTrigger value="final">Final Test</TabsTrigger><TabsTrigger value="input">Input Nilai</TabsTrigger><TabsTrigger value="rekap">Rekap Nilai</TabsTrigger>
          </TabsList>
          <TabsContent value="tp" className="space-y-4">
            <Card><CardContent className="flex items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><Heart className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Komponen Penilaian Sikap</p><p className="text-xs text-muted-foreground">{sikap?.is_active ? "Aktif — Sikap muncul di daftar penilaian" : "Nonaktif — Sikap tidak akan muncul di daftar penilaian"}</p></div></div><Switch checked={Boolean(sikap?.is_active)} onCheckedChange={(v) => sikapM.mutate(v)} /></CardContent></Card>
            <ObjectiveCard title="Tujuan Pembelajaran" subtitle={contextTitle} objectives={tpObjectives} loading={workspaceLoading} onAdd={() => openObjective("tp")} onEdit={(o) => openObjective("tp", o)} onDelete={(id) => deleteObjectiveM.mutate(id)} onCopy={() => setCopyOpen(true)} />
          </TabsContent>
          <TabsContent value="final" className="space-y-4">
            <ObjectiveCard title="Final Test" subtitle={contextTitle} objectives={finalObjectives} loading={workspaceLoading} onAdd={() => openObjective("final_test")} onEdit={(o) => openObjective("final_test", o)} onDelete={(id) => deleteObjectiveM.mutate(id)} />
          </TabsContent>
          <TabsContent value="input" className="space-y-4">
            <Card><CardContent className="p-0"><Button type="button" variant="ghost" className="h-auto w-full justify-between rounded-none p-5 text-left" onClick={() => setWeightsOpen((v) => !v)}><span className="flex items-center gap-3 font-semibold"><Settings2 className="h-5 w-5" />Pengaturan Bobot Komponen</span><span className="text-sm">{weightsOpen ? "Tutup" : "Buka"}</span></Button>{weightsOpen ? <WeightEditor objectives={gradingObjectives} weights={weights} setWeights={setWeights} total={totalWeight} saving={weightM.isPending} onSave={() => weightM.mutate()} /> : null}</CardContent></Card>
            <GradeTable title="Input Nilai Murid" subtitle={contextTitle} students={ws?.students ?? []} objectives={gradingObjectives} values={draftGrades} onChange={(k, v) => setDraftGrades((old) => ({ ...old, [k]: v }))} onSave={() => gradeM.mutate()} saving={gradeM.isPending} onImport={() => fileRef.current?.click()} />
            <input ref={fileRef} className="hidden" type="file" accept=".xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) importGrades(f); e.target.value = ""; }} />
          </TabsContent>
          <TabsContent value="rekap"><RecapTable title="Rekap Nilai" subtitle={contextTitle} students={ws?.students ?? []} objectives={gradingObjectives} values={draftGrades} /></TabsContent>
        </Tabs>
      ) : null}

      <ObjectiveDialog open={objectiveDialog} setOpen={setObjectiveDialog} form={form} setForm={setForm} saving={saveObjectiveM.isPending} onSave={() => saveObjectiveM.mutate()} />
      <CopyDialog open={copyOpen} setOpen={setCopyOpen} assignments={assignments.filter((x) => x.id !== selected?.id)} value={sourceId} setValue={setSourceId} saving={copyM.isPending} onCopy={() => copyM.mutate()} />
    </div>
  );
}

function uniqueBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) { return [...new Map(rows.map((x) => [String(x[key]), x])).values()]; }

function FilterSelect({ label, value, onChange, disabled, items }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; items: { value: string; label: string }[] }) {
  return <div className="space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger className="h-11"><SelectValue placeholder={`Pilih ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{items.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></div>;
}

function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <Card><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><BookOpen className="mb-4 h-10 w-10 text-muted-foreground/50" /><p className="font-medium text-muted-foreground">{title}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></CardContent></Card>;
}

function ObjectiveCard({ title, subtitle, objectives, loading, onAdd, onEdit, onDelete, onCopy }: { title: string; subtitle: string; objectives: Objective[]; loading: boolean; onAdd: () => void; onEdit: (o: Objective) => void; onDelete: (id: string) => void; onCopy?: () => void }) {
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div><div className="flex flex-wrap justify-end gap-2">{onCopy ? <Button variant="outline" onClick={onCopy}><Copy className="mr-2 h-4 w-4" />Salin dari Rombel Lain</Button> : null}<Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Tambah {title === "Final Test" ? "Final Test" : "TP"}</Button></div></CardHeader><CardContent>{loading ? <p className="py-12 text-center text-muted-foreground">Memuat…</p> : objectives.length === 0 ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><BookOpen className="mb-4 h-10 w-10 text-muted-foreground/40" /><p className="font-medium text-muted-foreground">Belum ada {title}</p><p className="text-sm text-muted-foreground">Klik tombol tambah untuk membuat komponen baru</p></div> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-16">No</TableHead><TableHead className="w-28">Kode</TableHead><TableHead>Deskripsi</TableHead><TableHead>Model Penilaian</TableHead><TableHead>Bobot</TableHead><TableHead className="w-24 text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{objectives.map((o, i) => <TableRow key={o.id}><TableCell>{i + 1}</TableCell><TableCell><Badge variant="secondary">{o.kode_tp}</Badge></TableCell><TableCell>{o.deskripsi}</TableCell><TableCell><Badge variant="outline">{MODEL_LABEL[o.model_penilaian ?? ""] ?? o.model_penilaian}</Badge></TableCell><TableCell>{o.bobot ?? 0}%</TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" title="Edit" onClick={() => onEdit(o)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Hapus" onClick={() => onDelete(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card>;
}

function ObjectiveDialog({ open, setOpen, form, setForm, saving, onSave }: { open: boolean; setOpen: (v: boolean) => void; form: ObjectiveForm; setForm: (v: ObjectiveForm) => void; saving: boolean; onSave: () => void }) {
  const valid = form.kode_tp.trim() && form.deskripsi.trim();
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{form.id ? "Edit" : "Tambah"} {form.komponen_type === "tp" ? "Tujuan Pembelajaran" : "Final Test"}</DialogTitle><DialogDescription>Lengkapi komponen penilaian untuk mata pelajaran ini.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Kode</Label><Input value={form.kode_tp} onChange={(e) => setForm({ ...form, kode_tp: e.target.value })} placeholder="TP1" /></div><div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Tuliskan deskripsi tujuan pembelajaran…" className="min-h-24" /></div><div className="space-y-2"><Label>Model Penilaian</Label><Select value={form.model_penilaian} onValueChange={(v) => setForm({ ...form, model_penilaian: v as ObjectiveForm["model_penilaian"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MODEL_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Bobot (%)</Label><Input type="number" min={0} max={100} value={form.bobot} onChange={(e) => setForm({ ...form, bobot: Math.max(0, Math.min(100, Number(e.target.value))) })} /></div><div className="space-y-2"><Label>Tanggal Rencana (opsional)</Label><Input type="date" value={form.tanggal_rencana_penilaian} onChange={(e) => setForm({ ...form, tanggal_rencana_penilaian: e.target.value })} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={!valid || saving} onClick={onSave}>{saving ? "Menyimpan…" : form.id ? "Simpan" : "Tambah"}</Button></DialogFooter></DialogContent></Dialog>;
}

function CopyDialog({ open, setOpen, assignments, value, setValue, saving, onCopy }: { open: boolean; setOpen: (v: boolean) => void; assignments: Assignment[]; value: string; setValue: (v: string) => void; saving: boolean; onCopy: () => void }) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Salin dari Rombel Lain</DialogTitle><DialogDescription>Pilih sumber tujuan pembelajaran pada semester aktif.</DialogDescription></DialogHeader><div className="space-y-2"><Label>Rombel sumber</Label><Select value={value} onValueChange={setValue}><SelectTrigger><SelectValue placeholder="Pilih rombel dan mata pelajaran" /></SelectTrigger><SelectContent>{assignments.map((x) => <SelectItem key={x.id} value={x.id}>{x.rombel_name} — {x.mapel_name} — {x.guru_name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button disabled={!value || saving} onClick={onCopy}><Copy className="mr-2 h-4 w-4" />{saving ? "Menyalin…" : "Salin"}</Button></DialogFooter></DialogContent></Dialog>;
}

function WeightEditor({ objectives, weights, setWeights, total, saving, onSave }: { objectives: Objective[]; weights: Record<string, number>; setWeights: Dispatch<SetStateAction<Record<string, number>>>; total: number; saving: boolean; onSave: () => void }) {
  return <div className="border-t p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{objectives.map((o) => <div key={o.id} className="flex items-center gap-3 rounded-md border p-3"><Badge>{o.komponen_type === "final_test" ? "FT" : "TP"}</Badge><div className="min-w-0 flex-1"><p className="truncate font-medium">{o.kode_tp}</p><p className="truncate text-xs text-muted-foreground">{o.deskripsi}</p></div><Input className="w-20" type="number" min={0} max={100} value={weights[o.id] ?? 0} onChange={(e) => setWeights((old) => ({ ...old, [o.id]: Math.max(0, Math.min(100, Number(e.target.value))) }))} /><span className="text-sm">%</span></div>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Total Bobot: <strong className={total === 100 ? "text-primary" : "text-destructive"}>{total}%</strong> <span>(Idealnya 100%)</span></p><Button disabled={!objectives.length || saving} onClick={onSave}><Save className="mr-2 h-4 w-4" />Simpan Bobot</Button></div></div>;
}

function GradeTable({ title, subtitle, students, objectives, values, onChange, onSave, saving, onImport }: { title: string; subtitle: string; students: Workspace["students"]; objectives: Objective[]; values: Record<string, string>; onChange: (key: string, value: string) => void; onSave: () => void; saving: boolean; onImport: () => void }) {
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />{title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div><div className="flex gap-2"><Button variant="outline" onClick={onImport}><Upload className="mr-2 h-4 w-4" />Import Semua</Button><Button disabled={!objectives.length || saving} onClick={onSave}><Save className="mr-2 h-4 w-4" />{saving ? "Menyimpan…" : "Simpan Semua"}</Button></div></CardHeader><CardContent>{!objectives.length ? <EmptyPanel title="Belum ada komponen penilaian" detail="Tambahkan tujuan pembelajaran atau final test terlebih dahulu." /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-16">No</TableHead><TableHead className="min-w-52">Nama Murid</TableHead>{objectives.map((o) => <TableHead key={o.id} className="min-w-28 text-center"><Badge>{o.kode_tp}</Badge><div className="mt-1 text-xs font-normal text-muted-foreground">({o.bobot ?? 0}%)</div></TableHead>)}<TableHead className="min-w-24 text-center">Rata-rata</TableHead></TableRow></TableHeader><TableBody>{students.map((s, i) => { const nums = objectives.map((o) => Number(values[`${s.id}:${o.id}`])).filter(Number.isFinite); return <TableRow key={s.id}><TableCell>{i + 1}</TableCell><TableCell><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.nis ?? "—"}</p></TableCell>{objectives.map((o) => <TableCell key={o.id}><Input aria-label={`${s.name} ${o.kode_tp}`} className="mx-auto w-20 text-center" type="number" min={0} max={100} value={values[`${s.id}:${o.id}`] ?? ""} placeholder="-" onChange={(e) => onChange(`${s.id}:${o.id}`, e.target.value)} /></TableCell>)}<TableCell className="text-center font-medium">{nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "—"}</TableCell></TableRow>; })}</TableBody></Table></div>}</CardContent></Card>;
}

function RecapTable({ title, subtitle, students, objectives, values }: { title: string; subtitle: string; students: Workspace["students"]; objectives: Objective[]; values: Record<string, string> }) {
  const totalWeight = objectives.reduce((s, o) => s + Number(o.bobot ?? 0), 0);
  return <Card><CardHeader><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{subtitle}</p></CardHeader><CardContent>{!objectives.length ? <EmptyPanel title="Belum ada nilai untuk direkap" detail="Tambahkan komponen dan input nilai terlebih dahulu." /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>No</TableHead><TableHead className="min-w-52">Nama Murid</TableHead>{objectives.map((o) => <TableHead key={o.id} className="text-center">{o.kode_tp}<span className="block text-xs font-normal text-muted-foreground">{o.bobot ?? 0}%</span></TableHead>)}<TableHead className="text-center">Nilai Akhir</TableHead><TableHead className="text-center">Predikat</TableHead></TableRow></TableHeader><TableBody>{students.map((student, i) => { let weighted = 0; let has = false; for (const o of objectives) { const raw = values[`${student.id}:${o.id}`]; if (raw !== undefined && raw !== "") { weighted += Number(raw) * Number(o.bobot ?? 0); has = true; } } const score = has && totalWeight > 0 ? weighted / totalWeight : null; return <TableRow key={student.id}><TableCell>{i + 1}</TableCell><TableCell><p className="font-medium">{student.name}</p><p className="text-xs text-muted-foreground">{student.nis ?? "—"}</p></TableCell>{objectives.map((o) => <TableCell key={o.id} className="text-center">{values[`${student.id}:${o.id}`] || "—"}</TableCell>)}<TableCell className="text-center font-semibold">{score === null ? "—" : score.toFixed(1)}</TableCell><TableCell className="text-center"><Badge variant={score !== null && score >= 75 ? "default" : "secondary"}>{score === null ? "—" : score >= 90 ? "A" : score >= 80 ? "B" : score >= 75 ? "C" : "D"}</Badge></TableCell></TableRow>; })}</TableBody></Table></div>}<p className="mt-4 text-xs text-muted-foreground">Nilai akhir dihitung berdasarkan bobot komponen. Total bobot saat ini {totalWeight}%.</p></CardContent></Card>;
}
