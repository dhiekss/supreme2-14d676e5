import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Database, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet, FileJson } from "lucide-react";
import { toast } from "sonner";
import { exportBackup, importBackup } from "@/lib/backup.functions";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Impor & Backup — SUPREME XPOES" }] }),
  component: ImportBackupPage,
});

type BackupResult = {
  meta: {
    generated_at: string;
    app: string;
    version: number;
    totalRows: number;
    tables: number;
    stats: Record<string, number>;
    errors: Record<string, string>;
  };
  data: Record<string, any[]>;
};

type ImportResult = {
  generated_at: string;
  totalInserted: number;
  tables: number;
  stats: Record<string, number>;
  errors: Record<string, string>;
};

function ImportBackupPage() {
  const runExport = useServerFn(exportBackup);
  const runImport = useServerFn(importBackup);
  const [loadingFormat, setLoadingFormat] = useState<null | "json" | "xlsx">(null);
  const [lastResult, setLastResult] = useState<null | BackupResult["meta"]>(null);
  const [importing, setImporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importResult, setImportResult] = useState<null | ImportResult>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackup = async (): Promise<BackupResult> => {
    return (await runExport()) as BackupResult;
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  const handleExportJson = async () => {
    setLoadingFormat("json");
    const t = toast.loading("Menyiapkan backup JSON...");
    try {
      const result = await fetchBackup();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      triggerDownload(blob, `supremexpoes-backup-${stamp()}.json`);
      setLastResult(result.meta);
      const errCount = Object.keys(result.meta.errors).length;
      toast.success(
        `Backup JSON selesai: ${result.meta.totalRows.toLocaleString("id-ID")} baris dari ${result.meta.tables} tabel${errCount ? ` (${errCount} tabel gagal)` : ""}`,
        { id: t },
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat backup JSON", { id: t });
    } finally {
      setLoadingFormat(null);
    }
  };

  const handleExportXlsx = async () => {
    setLoadingFormat("xlsx");
    const t = toast.loading("Menyiapkan backup Excel...");
    try {
      const result = await fetchBackup();
      const wb = XLSX.utils.book_new();

      // _META sheet
      const metaRows: any[][] = [
        ["Aplikasi", result.meta.app],
        ["Versi", result.meta.version],
        ["Dibuat pada", result.meta.generated_at],
        ["Total tabel", result.meta.tables],
        ["Total baris", result.meta.totalRows],
        [],
        ["Tabel", "Jumlah Baris", "Error"],
        ...Object.keys(result.data)
          .sort()
          .map((name) => [name, result.meta.stats[name] ?? 0, result.meta.errors[name] ?? ""]),
      ];
      const metaWs = XLSX.utils.aoa_to_sheet(metaRows);
      XLSX.utils.book_append_sheet(wb, metaWs, "_META");

      // Data sheets — one per table
      for (const [table, rows] of Object.entries(result.data)) {
        const flatRows = (rows ?? []).map((r) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(r ?? {})) {
            out[k] = v === null || v === undefined
              ? ""
              : typeof v === "object"
                ? JSON.stringify(v)
                : v;
          }
          return out;
        });
        const ws = flatRows.length
          ? XLSX.utils.json_to_sheet(flatRows)
          : XLSX.utils.aoa_to_sheet([["(tabel kosong)"]]);
        // Excel sheet name max 31 chars, no : \ / ? * [ ]
        const safe = table.replace(/[:\\/?*\[\]]/g, "_").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safe);
      }

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, `supremexpoes-backup-${stamp()}.xlsx`);
      setLastResult(result.meta);
      const errCount = Object.keys(result.meta.errors).length;
      toast.success(
        `Backup Excel selesai: ${result.meta.totalRows.toLocaleString("id-ID")} baris dari ${result.meta.tables} tabel${errCount ? ` (${errCount} tabel gagal)` : ""}`,
        { id: t },
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat backup Excel", { id: t });
    } finally {
      setLoadingFormat(null);
    }
  };

  const busy = loadingFormat !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impor & Backup</h1>
        <p className="text-sm text-muted-foreground">
          Unduh backup lengkap database atau muat ulang dari file backup.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" /> Ekspor Database
          </CardTitle>
          <CardDescription>
            Ekspor seluruh data dari semua menu (guru, murid, rombel, KBM, nilai, kehadiran,
            perpustakaan, sarpras, persuratan, TPG, pengaturan, dsb.) menjadi satu berkas.
            Gunakan sebagai cadangan berkala atau arsip akhir tahun ajaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleExportXlsx} disabled={busy}>
              {loadingFormat === "xlsx" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyiapkan Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Ekspor ke Excel (.xlsx)
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleExportJson} disabled={busy}>
              {loadingFormat === "json" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyiapkan JSON...
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4 mr-2" /> Ekspor ke JSON
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Excel: setiap tabel jadi satu sheet, plus sheet <code>_META</code> berisi ringkasan.
            JSON: satu berkas berisi semua tabel — cocok untuk restore penuh di kemudian hari.
            Proses bisa memakan waktu bila data besar; jangan tutup halaman.
          </p>

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
            <Upload className="h-5 w-5" /> Impor Data
          </CardTitle>
          <CardDescription>
            Unggah file backup <code>.json</code> hasil ekspor SUPREME XPOES untuk memuat ulang
            data ke database. Baris yang sudah ada (berdasarkan <code>id</code>) akan
            <strong> ditimpa</strong>. Disarankan membuat ekspor terlebih dahulu sebagai cadangan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f) {
                setPendingFile(f);
                setConfirmOpen(true);
              }
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing || busy}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Pilih file backup (.json)
                </>
              )}
            </Button>
            {pendingFile && !confirmOpen && (
              <span className="text-xs text-muted-foreground truncate max-w-xs">
                {pendingFile.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Proses berjalan tabel demi tabel mengikuti urutan dependensi. Bila ada tabel gagal,
            proses tetap dilanjutkan dan galat ditampilkan di bawah.
          </p>

          {importResult && (
            <div className="rounded-md border p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Impor terakhir: {new Date(importResult.generated_at).toLocaleString("id-ID")}
              </div>
              <div className="text-sm text-muted-foreground">
                Total <strong>{importResult.totalInserted.toLocaleString("id-ID")}</strong> baris
                dimuat ke <strong>{importResult.tables}</strong> tabel.
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-primary hover:underline">
                  Lihat rincian per tabel
                </summary>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 font-mono">
                  {Object.entries(importResult.stats)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([t, n]) => (
                      <div
                        key={t}
                        className="flex justify-between border-b border-dashed border-border/50 py-0.5"
                      >
                        <span className="truncate">{t}</span>
                        <span className={n === 0 ? "text-muted-foreground" : "text-foreground"}>
                          {n}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
              {Object.keys(importResult.errors).length > 0 && (
                <div className="text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold">Tabel dengan galat:</div>
                    <ul className="list-disc list-inside">
                      {Object.entries(importResult.errors).map(([t, msg]) => (
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Impor backup ke database?</AlertDialogTitle>
            <AlertDialogDescription>
              File <strong>{pendingFile?.name}</strong> akan dimuat ke database. Baris yang sudah
              ada (berdasarkan <code>id</code>) akan ditimpa oleh isi backup. Tindakan ini tidak
              dapat dibatalkan — pastikan Anda sudah mengunduh ekspor cadangan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingFile) return;
                setConfirmOpen(false);
                setImporting(true);
                const t = toast.loading("Membaca & mengimpor file...");
                try {
                  const text = await pendingFile.text();
                  const parsed = JSON.parse(text);
                  const payload =
                    parsed && parsed.data && typeof parsed.data === "object"
                      ? parsed
                      : { data: parsed };
                  const res = (await runImport({
                    data: { data: payload.data, mode: "upsert" },
                  })) as ImportResult;
                  setImportResult(res);
                  const errCount = Object.keys(res.errors).length;
                  toast.success(
                    `Impor selesai: ${res.totalInserted.toLocaleString("id-ID")} baris${errCount ? ` (${errCount} tabel gagal)` : ""}`,
                    { id: t },
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Gagal mengimpor backup", { id: t });
                } finally {
                  setImporting(false);
                  setPendingFile(null);
                }
              }}
            >
              Ya, impor sekarang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
