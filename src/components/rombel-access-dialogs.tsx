import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { School, Search } from "lucide-react";
import {
  listRombelForAccess,
  getUserRombels,
  setUserRombels,
  bulkSetUserRombels,
} from "@/lib/user-rombel.functions";

type Rombel = {
  id: string;
  name: string | null;
  tingkat: string | null;
  konsentrasi_keahlian: string | null;
};

function RombelPicker({
  rombels,
  selected,
  onChange,
}: {
  rombels: Rombel[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("manual");

  const tingkatOptions = useMemo(
    () =>
      Array.from(new Set(rombels.map((r) => r.tingkat).filter(Boolean))).sort() as string[],
    [rombels],
  );
  const konsentrasiOptions = useMemo(
    () =>
      Array.from(
        new Set(rombels.map((r) => r.konsentrasi_keahlian).filter(Boolean)),
      ).sort() as string[],
    [rombels],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rombels;
    return rombels.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        (r.konsentrasi_keahlian ?? "").toLowerCase().includes(needle) ||
        (r.tingkat ?? "").toLowerCase().includes(needle),
    );
  }, [rombels, q]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(rombels.map((r) => r.id)));
  const clearAll = () => onChange(new Set());
  const selectByKonsentrasi = (k: string) =>
    onChange(new Set(rombels.filter((r) => r.konsentrasi_keahlian === k).map((r) => r.id)));
  const selectByTingkat = (t: string) =>
    onChange(new Set(rombels.filter((r) => r.tingkat === t).map((r) => r.id)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <School className="h-4 w-4" /> Akses Rombel
        </div>
        <Badge variant="outline">{selected.size} rombel dipilih</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="semua">Semua</TabsTrigger>
          <TabsTrigger value="konsentrasi">Konsentrasi</TabsTrigger>
          <TabsTrigger value="tingkat">Tingkat</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-2 mt-3">
          <div className="text-xs text-muted-foreground">Pilih rombel secara manual</div>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari rombel…"
              className="pl-7 h-9"
            />
          </div>
          <div className="max-h-[45vh] overflow-y-auto rounded-md border p-2">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Rombel tidak ditemukan
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {filtered.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 text-sm cursor-pointer py-1.5 px-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                  <span className="font-medium">{r.name}</span>
                </label>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="semua" className="space-y-2 mt-3">
          <div className="text-xs text-muted-foreground">
            Berikan akses ke semua rombel, atau kosongkan seluruhnya.
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={selectAll}>
              Pilih Semua ({rombels.length})
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearAll}>
              Kosongkan
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="konsentrasi" className="space-y-2 mt-3">
          <div className="text-xs text-muted-foreground">
            Pilih semua rombel berdasarkan konsentrasi keahlian.
          </div>
          <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto">
            {konsentrasiOptions.length === 0 && (
              <div className="text-sm text-muted-foreground">Belum ada konsentrasi</div>
            )}
            {konsentrasiOptions.map((k) => {
              const ids = rombels.filter((r) => r.konsentrasi_keahlian === k).map((r) => r.id);
              const allOn = ids.every((id) => selected.has(id));
              return (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={allOn ? "default" : "outline"}
                  onClick={() => selectByKonsentrasi(k)}
                >
                  {k} ({ids.length})
                </Button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="tingkat" className="space-y-2 mt-3">
          <div className="text-xs text-muted-foreground">
            Pilih semua rombel berdasarkan tingkat.
          </div>
          <div className="flex flex-wrap gap-2">
            {tingkatOptions.length === 0 && (
              <div className="text-sm text-muted-foreground">Belum ada tingkat</div>
            )}
            {tingkatOptions.map((t) => {
              const ids = rombels.filter((r) => r.tingkat === t).map((r) => r.id);
              const allOn = ids.every((id) => selected.has(id));
              return (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={allOn ? "default" : "outline"}
                  onClick={() => selectByTingkat(t)}
                >
                  Tingkat {t} ({ids.length})
                </Button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================ Individual ============================
export function RombelAccessDialog({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: { id: string; full_name?: string | null; email?: string | null } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const listFn = useServerFn(listRombelForAccess);
  const getFn = useServerFn(getUserRombels);
  const setFn = useServerFn(setUserRombels);

  const { data: rombels = [] } = useQuery({
    queryKey: ["rombel-for-access"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const { data, isFetching } = useQuery({
    queryKey: ["user-rombels", user?.id],
    queryFn: () => getFn({ data: { user_id: user!.id } }),
    enabled: !!user && open,
  });

  useEffect(() => {
    if (data) setSelected(new Set(data.rombel_ids));
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      setFn({ data: { user_id: user!.id, rombel_ids: Array.from(selected) } }),
    onSuccess: () => {
      toast.success("Akses rombel disimpan");
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-4 w-4" /> Akses Rombel
          </DialogTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              {user.full_name ?? user.email}
            </p>
          )}
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : (
          <RombelPicker rombels={rombels} selected={selected} onChange={setSelected} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !user}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {save.isPending ? "Menyimpan…" : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================ Bulk ============================
export function BulkRombelAccessDialog({
  userIds,
  open,
  onOpenChange,
  onSaved,
}: {
  userIds: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [mode, setMode] = useState<"replace" | "append" | "remove">("replace");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const listFn = useServerFn(listRombelForAccess);
  const bulkFn = useServerFn(bulkSetUserRombels);

  const { data: rombels = [] } = useQuery({
    queryKey: ["rombel-for-access"],
    queryFn: () => listFn(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setMode("replace");
      setSelected(new Set());
    }
  }, [open]);

  const apply = useMutation({
    mutationFn: () =>
      bulkFn({
        data: { user_ids: userIds, rombel_ids: Array.from(selected), mode },
      }),
    onSuccess: (r: any) => {
      toast.success(`Akses rombel diperbarui untuk ${r.affected} user`);
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const modeHint: Record<string, string> = {
    replace: "Rombel yang ada akan dihapus dan diganti dengan rombel yang dipilih",
    append: "Rombel yang dipilih akan ditambahkan ke akses yang sudah ada",
    remove: "Rombel yang dipilih akan dihapus dari akses user",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <School className="h-4 w-4" /> Atur Akses Rombel Massal
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Mengatur akses rombel untuk {userIds.length} user yang dipilih
          </p>
        </DialogHeader>

        <div>
          <Label>Mode Pengaturan</Label>
          <Select value={mode} onValueChange={(v: any) => setMode(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Ganti Semua (hapus rombel lama)</SelectItem>
              <SelectItem value="append">Tambahkan ke akses yang ada</SelectItem>
              <SelectItem value="remove">Hapus rombel yang dipilih</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{modeHint[mode]}</p>
        </div>

        <RombelPicker rombels={rombels} selected={selected} onChange={setSelected} />

        {mode === "replace" && selected.size === 0 && (
          <p className="text-xs text-amber-600 font-medium">
            Semua akses rombel user akan dihapus!
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={() => apply.mutate()}
            disabled={apply.isPending || userIds.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {apply.isPending ? "Menerapkan…" : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
