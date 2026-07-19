import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Search, Users, User, AlertCircle } from "lucide-react";
import { listSiswaForDashboard } from "@/lib/dashboard-murid.functions";

export const Route = createFileRoute("/_authenticated/dashboard-murid/")({
  head: () => ({ meta: [{ title: "Dashboard Murid — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listSiswaForDashboard);
  const { data } = useQuery({ queryKey: ["dashboard-murid-list"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [rombelId, setRombelId] = useState<string>("all");
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const s = q.trim().toLowerCase();
    return list.filter((r: any) => {
      if (rombelId !== "all" && r.rombel_id !== rombelId) return false;
      if (!s) return true;
      return `${r.name} ${r.nis}`.toLowerCase().includes(s);
    });
  }, [data, q, rombelId]);

  useEffect(() => {
    if (data && !data.isStaff && data.rows.length === 1) {
      navigate({ to: "/dashboard-murid/$studentId", params: { studentId: data.rows[0].id }, replace: true });
    }
  }, [data, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Murid</h1>
        <p className="text-muted-foreground text-sm mt-1">Pilih murid untuk melihat dashboard mereka</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari berdasarkan nama atau NIS..."
                className="pl-9 h-11 bg-muted/30 border-0"
              />
            </div>
            <Select value={rombelId} onValueChange={setRombelId}>
              <SelectTrigger className="w-full sm:w-56 h-11 bg-muted/30 border-0">
                <SelectValue placeholder="Semua Rombel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Rombel</SelectItem>
                {(data?.rombelOptions ?? []).map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 sm:px-6 py-4 border-b flex items-center gap-2">
            <Users className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold">Daftar Murid</div>
              <div className="text-xs text-muted-foreground">{rows.length} murid ditemukan</div>
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              isStaff={!!data?.isStaff}
              hasAccess={data?.hasAccess ?? true}
              hasFilter={q.trim().length > 0 || rombelId !== "all"}
            />
          ) : (
            <div className="p-3 sm:p-4 space-y-2">
              {rows.slice(0, 200).map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 p-3 rounded-lg border hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">NIS: {r.nis} • {r.rombel_name}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto shrink-0">
                    <Link to="/dashboard-murid/$studentId" params={{ studentId: r.id }}>
                      <Eye className="h-4 w-4 mr-2" /> Lihat Dashboard
                    </Link>
                  </Button>
                </div>
              ))}
              {rows.length > 200 && (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  Menampilkan 200 dari {rows.length} murid. Persempit dengan pencarian atau filter rombel.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

  );
}
