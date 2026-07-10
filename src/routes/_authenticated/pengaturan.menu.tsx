import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  ChevronRight,
  ChevronDown,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMenuLayouts,
  saveMenuLayout,
  resetMenuLayout,
  ROLES,
  type Role,
} from "@/lib/menu-layout.functions";
import {
  DEFAULT_SIDEBAR,
  defaultLayout,
  resolveLayout,
  buildDefaultIndex,
  type LayoutNode,
  type LayoutGroupOverride,
  type LayoutLeafOverride,
  isDefaultGroup,
} from "@/lib/sidebar-menu";

export const Route = createFileRoute("/_authenticated/pengaturan/menu")({
  component: PengaturanMenuPage,
});

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  wakasek: "Wakasek",
  kaprog: "Ka. Prog",
  guru: "Guru",
  murid: "Murid",
  admin_persuratan: "Admin Persuratan",
  admin_sarpras: "Admin Sarpras",
  admin_tpg: "Admin TPG",
};

function PengaturanMenuPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getUser();
      if (!sess.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data } = await supabase.rpc("has_role", {
        _user_id: sess.user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
      if (!data) {
        toast.error("Hanya admin yang bisa mengakses halaman ini");
        navigate({ to: "/dashboard" });
      }
    })();
  }, [navigate]);

  if (!isAdmin) return null;
  return <Editor />;
}

function Editor() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMenuLayouts);
  const saveFn = useServerFn(saveMenuLayout);
  const resetFn = useServerFn(resetMenuLayout);

  const { data, isLoading } = useQuery({
    queryKey: ["menu-layouts-all"],
    queryFn: () => listFn(),
  });

  const [role, setRole] = useState<Role>("admin");
  const [layout, setLayout] = useState<LayoutNode[]>(defaultLayout());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    const row = data.rows.find((r) => r.role === role);
    setLayout(row?.layout?.length ? (row.layout as LayoutNode[]) : defaultLayout());
    setDirty(false);
  }, [data, role]);

  const saveMut = useMutation({
    mutationFn: (payload: { role: Role; layout: LayoutNode[] }) =>
      saveFn({ data: payload }),
    onSuccess: () => {
      toast.success("Layout menu tersimpan");
      qc.invalidateQueries({ queryKey: ["menu-layouts-all"] });
      qc.invalidateQueries({ queryKey: ["sidebar-layout"] });
      setDirty(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal menyimpan"),
  });

  const resetMut = useMutation({
    mutationFn: (payload: { role: Role }) => resetFn({ data: payload }),
    onSuccess: () => {
      toast.success("Layout dikembalikan ke default");
      qc.invalidateQueries({ queryKey: ["menu-layouts-all"] });
      qc.invalidateQueries({ queryKey: ["sidebar-layout"] });
      setLayout(defaultLayout());
      setDirty(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Gagal mereset"),
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Menu Sidebar</h1>
        <p className="text-sm text-muted-foreground">
          Atur urutan, nama, visibilitas, dan grup menu sidebar untuk tiap role.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editor Menu per Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {ROLES.map((r) => {
              const hasOverride = !!data?.rows.find((x) => x.role === r)?.layout?.length;
              const active = r === role;
              return (
                <div
                  key={r}
                  className={`flex items-center justify-between rounded-md border p-2 ${
                    active ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{ROLE_LABEL[r]}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {hasOverride ? "Custom" : "Default"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setRole(r)}
                  >
                    Atur
                  </Button>
                </div>
              );
            })}
          </div>
          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsContent value={role} className="mt-2">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Memuat…</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Button
                      size="sm"
                      onClick={() => saveMut.mutate({ role, layout })}
                      disabled={!dirty || saveMut.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Simpan Perubahan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLayout(defaultLayout());
                        setDirty(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Muat Default
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resetMut.mutate({ role })}
                      disabled={resetMut.isPending}
                    >
                      Hapus Override
                    </Button>
                    {dirty && (
                      <Badge variant="secondary" className="ml-1">
                        Ada perubahan belum disimpan
                      </Badge>
                    )}
                  </div>

                  <LayoutEditor
                    layout={layout}
                    onChange={(next) => {
                      setLayout(next);
                      setDirty(true);
                    }}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Editor ---------------- */

const TOP_LEVEL = "__top__";

function LayoutEditor({
  layout,
  onChange,
}: {
  layout: LayoutNode[];
  onChange: (n: LayoutNode[]) => void;
}) {
  const { leaves: leafIdx, groups: groupIdx } = useMemo(() => buildDefaultIndex(), []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Resolve for display metadata (icons, defaults)
  const resolved = resolveLayout(layout);

  const groupIds = layout
    .filter((n): n is LayoutGroupOverride => n.kind === "group")
    .map((g) => g.id);
  const groupOptions = [
    { value: TOP_LEVEL, label: "(Tanpa grup / top-level)" },
    ...groupIds.map((id) => ({
      value: id,
      label: layout.find((n) => n.kind === "group" && n.id === id)?.label ??
        groupIdx.get(id)?.title ?? id,
    })),
  ];

  const topLevelIds = layout.map((n) => n.id);

  const updateNode = (nodeId: string, patch: { label?: string; hidden?: boolean }) => {
    onChange(
      layout.map((n): LayoutNode => {
        if (n.id === nodeId) {
          if (n.kind === "group") return { ...n, ...patch };
          return { ...n, ...patch };
        }
        if (n.kind === "group") {
          return {
            ...n,
            children: n.children.map((c) =>
              c.id === nodeId ? { ...c, ...patch } : c,
            ),
          };
        }
        return n;
      }),
    );
  };

  const moveLeafToParent = (leafId: string, targetParent: string) => {
    // Extract leaf from current location
    let extracted: LayoutLeafOverride | null = null;
    const next: LayoutNode[] = [];
    for (const n of layout) {
      if (n.kind === "leaf" && n.id === leafId) {
        extracted = n;
        continue;
      }
      if (n.kind === "group") {
        const kept: LayoutLeafOverride[] = [];
        for (const c of n.children) {
          if (c.id === leafId) extracted = c;
          else kept.push(c);
        }
        next.push({ ...n, children: kept });
      } else {
        next.push(n);
      }
    }
    if (!extracted) return;

    if (targetParent === TOP_LEVEL) {
      next.push(extracted);
    } else {
      for (let i = 0; i < next.length; i++) {
        const n = next[i];
        if (n.kind === "group" && n.id === targetParent) {
          next[i] = { ...n, children: [...n.children, extracted] };
          break;
        }
      }
    }
    onChange(next);
  };

  const handleTopDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = topLevelIds.indexOf(String(active.id));
    const newIdx = topLevelIds.indexOf(String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(layout, oldIdx, newIdx));
  };

  const handleChildDragEnd = (groupId: string) => (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onChange(
      layout.map((n) => {
        if (n.kind !== "group" || n.id !== groupId) return n;
        const ids = n.children.map((c) => c.id);
        const oldIdx = ids.indexOf(String(active.id));
        const newIdx = ids.indexOf(String(over.id));
        if (oldIdx < 0 || newIdx < 0) return n;
        return { ...n, children: arrayMove(n.children, oldIdx, newIdx) };
      }),
    );
  };

  return (
    <div className="rounded-lg border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopDragEnd}>
        <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y">
            {layout.map((n) => {
              const resolvedNode = resolved.find((r) => r.id === n.id);
              if (n.kind === "group") {
                return (
                  <GroupRow
                    key={n.id}
                    node={n}
                    defaultTitle={groupIdx.get(n.id)?.title ?? n.id}
                    onUpdate={(patch) => updateNode(n.id, patch)}
                    onChildUpdate={updateNode}
                    onMoveChild={moveLeafToParent}
                    groupOptions={groupOptions}
                    onChildDragEnd={handleChildDragEnd(n.id)}
                    sensors={sensors}
                    leafIdx={leafIdx}
                  />
                );
              }
              return (
                <LeafRow
                  key={n.id}
                  node={n}
                  defaultTitle={leafIdx.get(n.id)?.title ?? n.id}
                  url={leafIdx.get(n.id)?.url}
                  onUpdate={(patch) => updateNode(n.id, patch)}
                  parent={TOP_LEVEL}
                  groupOptions={groupOptions}
                  onMove={(target) => moveLeafToParent(n.id, target)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ---------------- Rows ---------------- */

function GroupRow({
  node,
  defaultTitle,
  onUpdate,
  onChildUpdate,
  onMoveChild,
  groupOptions,
  onChildDragEnd,
  sensors,
  leafIdx,
}: {
  node: LayoutGroupOverride;
  defaultTitle: string;
  onUpdate: (patch: { label?: string; hidden?: boolean }) => void;
  onChildUpdate: (id: string, patch: { label?: string; hidden?: boolean }) => void;
  onMoveChild: (leafId: string, target: string) => void;
  groupOptions: { value: string; label: string }[];
  onChildDragEnd: (e: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  leafIdx: ReturnType<typeof buildDefaultIndex>["leaves"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const [open, setOpen] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const childIds = node.children.map((c) => c.id);

  return (
    <div ref={setNodeRef} style={style} className="bg-muted/30">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="p-1">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Badge variant="outline">Grup</Badge>
        <Input
          value={node.label ?? defaultTitle}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="max-w-xs h-8"
        />
        <span className="text-xs text-muted-foreground">({defaultTitle})</span>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onUpdate({ hidden: !node.hidden })}
          title={node.hidden ? "Tampilkan" : "Sembunyikan"}
        >
          {node.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {open && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onChildDragEnd}>
          <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
            <div className="pl-10 pr-2 pb-2 space-y-1 bg-background">
              {node.children.length === 0 && (
                <div className="text-xs text-muted-foreground py-2">Grup kosong</div>
              )}
              {node.children.map((c) => (
                <LeafRow
                  key={c.id}
                  node={c}
                  defaultTitle={leafIdx.get(c.id)?.title ?? c.id}
                  url={leafIdx.get(c.id)?.url}
                  onUpdate={(patch) => onChildUpdate(c.id, patch)}
                  parent={node.id}
                  groupOptions={groupOptions}
                  onMove={(target) => onMoveChild(c.id, target)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function LeafRow({
  node,
  defaultTitle,
  url,
  onUpdate,
  parent,
  groupOptions,
  onMove,
}: {
  node: LayoutLeafOverride;
  defaultTitle: string;
  url?: string;
  onUpdate: (patch: { label?: string; hidden?: boolean }) => void;
  parent: string;
  groupOptions: { value: string; label: string }[];
  onMove: (target: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-2 rounded border bg-card"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={node.label ?? defaultTitle}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="max-w-xs h-8"
      />
      <span className="text-xs text-muted-foreground truncate">
        {defaultTitle}
        {url ? ` · ${url}` : ""}
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
        <Select value={parent} onValueChange={onMove}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onUpdate({ hidden: !node.hidden })}
        title={node.hidden ? "Tampilkan" : "Sembunyikan"}
      >
        {node.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

// Reference imports to keep helpers used only in comments/types.
void DEFAULT_SIDEBAR;
void isDefaultGroup;
