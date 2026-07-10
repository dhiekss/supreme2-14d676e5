import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MENU_CATALOG, ALL_MENU_KEYS } from "@/lib/menu-catalog";
import {
  getUserMenus,
  setUserMenus,
  bulkSetUserMenus,
} from "@/lib/user-menu-permissions.functions";
import { Menu as MenuIcon, Search } from "lucide-react";

function MenuPicker({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return MENU_CATALOG;
    return MENU_CATALOG.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.label.toLowerCase().includes(needle) ||
          i.key.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const toggleGroup = (keys: string[]) => {
    const allOn = keys.every((k) => selected.has(k));
    keys.forEach((k) => {
      if (allOn) {
        if (selected.has(k)) onToggle(k);
      } else {
        if (!selected.has(k)) onToggle(k);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari menu…"
          className="pl-7 h-9"
        />
      </div>
      <div className="max-h-[45vh] overflow-y-auto rounded-md border divide-y">
        {groups.map((g) => {
          const keys = g.items.map((i) => i.key);
          const allOn = keys.every((k) => selected.has(k));
          const some = keys.some((k) => selected.has(k));
          return (
            <div key={g.title} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-sm">{g.title}</div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={allOn ? true : some ? "indeterminate" : false}
                    onCheckedChange={() => toggleGroup(keys)}
                  />
                  Semua
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {g.items.map((i) => (
                  <label
                    key={i.key}
                    className="flex items-center gap-2 text-sm cursor-pointer py-1 px-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(i.key)}
                      onCheckedChange={() => onToggle(i.key)}
                    />
                    {i.label}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Menu tidak ditemukan
          </div>
        )}
      </div>
    </div>
  );
}

// ============================ Individual ============================
export function MenuAccessDialog({
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
  const getFn = useServerFn(getUserMenus);
  const setFn = useServerFn(setUserMenus);

  const { data, isFetching } = useQuery({
    queryKey: ["user-menus", user?.id],
    queryFn: () => getFn({ data: { user_id: user!.id } }),
    enabled: !!user && open,
  });

  useEffect(() => {
    if (data) setSelected(new Set(data.menu_keys));
  }, [data]);

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => setFn({ data: { user_id: user!.id, menu_keys: Array.from(selected) } }),
    onSuccess: () => {
      toast.success("Akses menu disimpan");
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
            <MenuIcon className="h-4 w-4" /> Atur Akses Menu
          </DialogTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              {user.full_name ?? user.email}
            </p>
          )}
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelected(new Set(ALL_MENU_KEYS))}
          >
            Pilih Semua
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelected(new Set())}
          >
            Kosongkan
          </Button>
          <span className="ml-auto text-muted-foreground">
            {selected.size} / {ALL_MENU_KEYS.length} menu dipilih
          </span>
        </div>

        {isFetching ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : (
          <MenuPicker selected={selected} onToggle={toggle} />
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
export function BulkMenuAccessDialog({
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
  const bulkFn = useServerFn(bulkSetUserMenus);

  useEffect(() => {
    if (open) {
      setMode("replace");
      setSelected(new Set());
    }
  }, [open]);

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const apply = useMutation({
    mutationFn: () =>
      bulkFn({
        data: { user_ids: userIds, menu_keys: Array.from(selected), mode },
      }),
    onSuccess: (r: any) => {
      toast.success(`Akses menu diperbarui untuk ${r.affected} user`);
      onOpenChange(false);
      onSaved?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const modeHint: Record<string, string> = {
    replace: "Menu yang ada akan dihapus dan diganti dengan menu yang dipilih",
    append: "Menu yang dipilih akan ditambahkan ke akses yang sudah ada",
    remove: "Menu yang dipilih akan dihapus dari akses user",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MenuIcon className="h-4 w-4" /> Atur Akses Menu Massal
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Mengatur akses menu untuk {userIds.length} user yang dipilih
          </p>
        </DialogHeader>

        <div>
          <Label>Mode Pengaturan</Label>
          <Select value={mode} onValueChange={(v: any) => setMode(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">Ganti Semua (hapus menu lama)</SelectItem>
              <SelectItem value="append">Tambahkan ke akses yang ada</SelectItem>
              <SelectItem value="remove">Hapus menu yang dipilih</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">{modeHint[mode]}</p>
        </div>

        <div>
          <Label>Pilih Menu</Label>
          <div className="flex items-center gap-2 my-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set(ALL_MENU_KEYS))}
            >
              Pilih Semua
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
            >
              Kosongkan
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selected.size} menu dipilih
            </span>
          </div>
          <MenuPicker selected={selected} onToggle={toggle} />
        </div>

        {mode === "replace" && selected.size === 0 && (
          <p className="text-xs text-amber-600 font-medium">
            Semua akses menu user akan dihapus!
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
