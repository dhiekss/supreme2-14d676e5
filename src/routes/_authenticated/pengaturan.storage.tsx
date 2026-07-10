import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pengaturan/storage")({
  head: () => ({ meta: [{ title: "Storage — Pengaturan" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="h-5 w-5" /> Storage
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pengaturan penyimpanan berkas akan tersedia di sini.
      </CardContent>
    </Card>
  ),
});
