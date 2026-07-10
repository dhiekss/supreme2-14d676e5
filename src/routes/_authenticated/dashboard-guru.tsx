import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, QrCode, Search } from "lucide-react";
import { listGuruForDashboard } from "@/lib/dashboard-guru.functions";
import { QrDialog } from "@/components/qr-dialog";

export const Route = createFileRoute("/_authenticated/dashboard-guru")({
  head: () => ({ meta: [{ title: "Dashboard Guru — SUPREME XPOES" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listGuruForDashboard);
  const { data } = useQuery({ queryKey: ["dashboard-guru-list"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [qrFor, setQrFor] = useState<{ id: string; nama: string } | null>(null);
  const navigate = useNavigate();

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r: any) => `${r.nama ?? ""} ${r.nip ?? ""}`.toLowerCase().includes(s));
  }, [data, q]);

  // Guru non-admin: langsung menuju dashboard sendiri
  useEffect(() => {
    if (data && !data.isAdmin && data.rows.length === 1) {
      navigate({ to: "/dashboard-guru/$guruId", params: { guruId: data.rows[0].id }, replace: true });
    }
  }, [data, navigate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Guru</h1>
        <p className="text-muted-foreground text-sm mt-1">Pilih guru untuk melihat dashboard mereka</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau NIP guru..."
              className="pl-9 h-11 bg-muted/30 border-0"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-6 py-4 text-sm text-muted-foreground border-b">
            <div>Nama</div>
            <div>NIP</div>
            <div className="text-right pr-2">Aksi</div>
          </div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Tidak ada data guru.</div>
          ) : (
            rows.map((r: any) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-4 items-center px-6 py-3 border-b last:border-b-0 hover:bg-muted/30"
              >
                <div className="font-medium">{r.nama}</div>
                <div className="text-sm">{r.nip ?? "—"}</div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setQrFor({ id: r.id, nama: r.nama })}>
                    <QrCode className="h-4 w-4 mr-2" /> Tampilkan QR Code
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard-guru/$guruId" params={{ guruId: r.id }}>
                      <Eye className="h-4 w-4 mr-2" /> Lihat Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <QrDialog
        open={!!qrFor}
        onOpenChange={(o) => !o && setQrFor(null)}
        title={qrFor ? `QR Code — ${qrFor.nama}` : ""}
        value={qrFor?.id ?? ""}
      />
    </div>
  );
}
