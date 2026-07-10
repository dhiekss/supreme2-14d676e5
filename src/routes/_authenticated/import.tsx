import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({ meta: [{ title: "Impor Backup — SUPREME XPOES" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Impor Backup</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" /> Data lama sudah terimpor
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Seluruh data dari backup JSON sudah dimuat ke database SUPREME XPOES, mencakup
            data guru, murid, rombel, kehadiran, KBM, perpustakaan, sarpras, persuratan, dan TPG.
          </p>
          <p>
            Fitur unggah backup tambahan akan disediakan kemudian bila diperlukan untuk
            siklus tahun ajaran baru.
          </p>
        </CardContent>
      </Card>
    </div>
  ),
});
