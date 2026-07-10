import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Database, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { exportBackup } from "@/lib/backup.functions";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Impor & Backup — SUPREME XPOES" }] }),
  component: ImportBackupPage,
});

function ImportBackupPage() {
  const runExport = useServerFn(exportBackup);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<null | {
    generated_at: string;
    totalRows: number;
    tables: number;
    stats: Record<string, number>;
    errors: Record<string, string>;
  }>(null);

  const handleExport = async () => {
    setLoading(true);
    const t = toast.loading("Menyiapkan backup database...");
    try {
      const result = (await runExport()) as {
        meta: {
          generated_at: string;
          totalRows: number;
          tables: number;
          stats: Record<string, number>;
          errors: Record<string, string>;
        };
        data: Record<string, unknown[]>;
      };
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `supremexpoes-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLastResult(result.meta);
      const errCount = Object.keys(result.meta.errors).length;
      toast.success(
        `Backup selesai: ${result.meta.totalRows.toLocaleString("id-ID")} baris dari ${result.meta.tables} tabel${errCount ? ` (${errCount} tabel gagal)` : ""}`,
        { id: t },
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat backup", { id: t });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impor & Backup</h1>
        <p className="text-sm text-muted-foreground">
          Unduh backup lengkap database atau muat ulang dari file backup JSON.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Backup Database
          </CardTitle>
          <CardDescription>
            Membuat file JSON berisi seluruh data dari semua modul: master (guru, siswa,
            rombel, mapel), presensi & KBM, pembelajaran (nilai, berkas, agenda),
            perpustakaan, sarpras, persuratan, TPG, SP, suara publik, pengguna & peran,
            serta log aktivitas dan notifikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleExport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyiapkan backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" /> Unduh Backup (.json)
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Proses dapat memakan waktu beberapa saat tergantung volume data.
            </p>
          </div>

          {lastResult && (
            <div className="rounded-md border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Backup terakhir: {new Date(lastResult.generated_at).toLocaleString("id-ID")}
              </div>
              <div className="text-sm text-muted-foreground">
                Total <strong>{lastResult.totalRows.toLocaleString("id-ID")}</strong> baris dari{" "}
                <strong>{lastResult.tables}</strong> tabel.
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-primary hover:underline">
                  Lihat rincian per tabel
                </summary>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 font-mono">
                  {Object.entries(lastResult.stats)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([t, n]) => (
                      <div key={t} className="flex justify-between border-b border-dashed border-border/50 py-0.5">
                        <span className="truncate">{t}</span>
                        <span className={n === 0 ? "text-muted-foreground" : "text-foreground"}>{n}</span>
                      </div>
                    ))}
                </div>
              </details>
              {Object.keys(lastResult.errors).length > 0 && (
                <div className="text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Tabel dengan galat:</div>
                    <ul className="list-disc list-inside">
                      {Object.entries(lastResult.errors).map(([t, msg]) => (
                        <li key={t}>
                          <span className="font-mono">{t}</span>: {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" /> Impor Data
          </CardTitle>
          <CardDescription>
            Data lama sudah dimuat ke database SUPREME XPOES. Fitur unggah backup JSON
            untuk siklus tahun ajaran baru akan tersedia selanjutnya.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
