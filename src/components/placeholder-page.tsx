import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-5 w-5 text-amber-500" />
            Modul dalam pengembangan
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Fitur ini akan segera tersedia. Struktur menu sudah dibuat — fungsionalitas akan dikembangkan pada tahap berikutnya.
        </CardContent>
      </Card>
    </div>
  );
}
