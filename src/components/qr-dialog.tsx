import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function QrDialog({
  open,
  onOpenChange,
  title,
  value,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setTick((v) => v + 1), 15_000);
    return () => clearInterval(t);
  }, [open]);
  const dynamicValue = `${value}|${Math.floor(Date.now() / 15_000)}|${tick}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="p-4 bg-white rounded-lg border">
            <QRCodeSVG value={dynamicValue} size={220} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            QR Code dinamis untuk validasi kehadiran di kelas. QR Code berubah setiap 15 detik untuk keamanan.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
