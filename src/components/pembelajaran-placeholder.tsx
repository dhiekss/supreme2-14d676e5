import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PembelajaranPlaceholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Isian modul ini sedang disiapkan. Silakan kembali lagi nanti.
        </CardContent>
      </Card>
    </div>
  );
}
