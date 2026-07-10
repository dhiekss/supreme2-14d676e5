import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pengaturan/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Pengaturan" }] }),
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" /> Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Statistik penggunaan aplikasi akan tersedia di sini.
      </CardContent>
    </Card>
  ),
});
