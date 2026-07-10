import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Palette, Image as ImageIcon, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { upsertSetting } from "@/lib/settings.functions";
import { fetchDisplaySettings, fileToDataUrl, DEFAULT_DISPLAY, type DisplaySettings } from "@/lib/display-settings";

export const Route = createFileRoute("/_authenticated/pengaturan/tampilan")({
  head: () => ({ meta: [{ title: "Pengaturan Tampilan — SUPREME XPOES" }] }),
  component: TampilanPage,
});

function TampilanPage() {
  const qc = useQueryClient();
  const save = useServerFn(upsertSetting);
  const { data: settings } = useQuery({
    queryKey: ["display-settings"],
    queryFn: fetchDisplaySettings,
    initialData: DEFAULT_DISPLAY,
  });

  const saveField = useMutation({
    mutationFn: async (payload: { key: string; value: string }) => {
      await save({ data: { key: `display.${payload.key}`, value: payload.value } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["display-settings"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Tampilan</h1>
        <p className="text-sm text-muted-foreground">Kustomisasi tampilan halaman login dan aplikasi</p>
      </div>

      <IdentityCard settings={settings} onSave={(p) => saveField.mutateAsync(p)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BackgroundImageCard settings={settings} onSave={(p) => saveField.mutateAsync(p)} />
        <BackgroundColorCard settings={settings} onSave={(p) => saveField.mutateAsync(p)} />
      </div>

      <PreviewCard settings={settings} />
    </div>
  );
}

function IdentityCard({ settings, onSave }: { settings: DisplaySettings; onSave: (p: { key: string; value: string }) => Promise<void> }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        (["app_name", "subtitle", "instansi", "footer", "logo_url"] as const).map((k) =>
          onSave({ key: k, value: form[k] ?? "" }),
        ),
      );
      toast.success("Pengaturan teks disimpan");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return toast.error("Ukuran maksimal 2MB");
    try {
      const dataUrl = await fileToDataUrl(file, { maxW: 400, maxH: 480, quality: 0.9 });
      setForm({ ...form, logo_url: dataUrl });
      await onSave({ key: "logo_url", value: dataUrl });
      toast.success("Logo diunggah");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mengunggah");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5" /> Logo & Identitas Aplikasi
        </CardTitle>
        <p className="text-sm text-muted-foreground">Atur logo sekolah dan identitas aplikasi yang ditampilkan di halaman login</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label>Logo Sekolah</Label>
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <div className="font-medium">Ukuran Ideal:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li>Resolusi: <strong>200 x 240 piksel</strong></li>
                <li>Format: PNG (transparan) atau JPG</li>
                <li>Ukuran file: Maksimal 2MB</li>
              </ul>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 rounded-md border bg-muted flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <UploadBtn accept="image/*" label="Unggah Logo" onFile={handleLogoUpload} />
              {form.logo_url && (
                <Button variant="ghost" size="icon" onClick={async () => { setForm({ ...form, logo_url: "" }); await onSave({ key: "logo_url", value: "" }); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Aplikasi</Label>
              <Input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Subtitle Aplikasi</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nama Instansi</Label>
              <Input value={form.instansi} onChange={(e) => setForm({ ...form, instansi: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label>Teks Footer</Label>
          <Textarea rows={2} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} />
        </div>

        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Pengaturan Teks"}
        </Button>
      </CardContent>
    </Card>
  );
}

function BackgroundImageCard({ settings, onSave }: { settings: DisplaySettings; onSave: (p: { key: string; value: string }) => Promise<void> }) {
  const [bg, setBg] = useState(settings.bg_url);

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Ukuran maksimal 5MB");
    try {
      const dataUrl = await fileToDataUrl(file, { maxW: 1000, maxH: 1000, quality: 0.82 });
      setBg(dataUrl);
      await onSave({ key: "bg_url", value: dataUrl });
      toast.success("Gambar background disimpan");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async () => {
    setBg("");
    await onSave({ key: "bg_url", value: "" });
    toast.success("Gambar dihapus");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="h-5 w-5" /> Gambar Background Login
        </CardTitle>
        <p className="text-sm text-muted-foreground">Unggah gambar untuk ditampilkan di halaman login</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
          <div className="font-medium">Ukuran Ideal Gambar:</div>
          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
            <li>Resolusi: <strong>800 x 1000 piksel</strong> (rasio 4:5)</li>
            <li>Format: JPG, PNG, atau WebP</li>
            <li>Ukuran file: Maksimal 5MB</li>
          </ul>
        </div>
        {bg && (
          <div className="rounded-lg overflow-hidden border">
            <img src={bg} alt="bg" className="w-full max-h-80 object-cover" />
          </div>
        )}
        <div className="flex gap-2">
          <UploadBtn accept="image/*" label="Unggah Gambar" className="flex-1" onFile={handleUpload} />
          {bg && (
            <Button variant="destructive" size="icon" onClick={handleRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BackgroundColorCard({ settings, onSave }: { settings: DisplaySettings; onSave: (p: { key: string; value: string }) => Promise<void> }) {
  const [color, setColor] = useState(settings.bg_color);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="h-5 w-5" /> Warna Background Fallback
        </CardTitle>
        <p className="text-sm text-muted-foreground">Warna yang akan ditampilkan jika tidak ada gambar yang diunggah</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg h-56 border" style={{ background: color }} />
        <div className="space-y-1">
          <Label>Pilih Warna</Label>
          <div className="flex gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 rounded border cursor-pointer" />
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <Button className="w-full" onClick={async () => { await onSave({ key: "bg_color", value: color }); toast.success("Warna disimpan"); }}>
          Simpan Warna
        </Button>
      </CardContent>
    </Card>
  );
}

function PreviewCard({ settings }: { settings: DisplaySettings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preview Halaman Login</CardTitle>
        <p className="text-sm text-muted-foreground">Tampilan preview halaman login dengan pengaturan saat ini</p>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-lg border p-6 overflow-hidden"
          style={{ background: settings.bg_url ? `url(${settings.bg_url}) center/cover, ${settings.bg_color}` : settings.bg_color }}
        >
          <div className="rounded-md bg-white/80 backdrop-blur px-3 py-2 inline-flex items-center gap-2 mb-6">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4" /></div>
            )}
            <div className="leading-tight">
              <div className="font-bold text-xs text-primary">{settings.app_name}</div>
              <div className="text-[10px] text-primary/80">{settings.subtitle}</div>
              <div className="text-[10px] text-primary/80">{settings.instansi}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 items-center">
            {settings.bg_url ? (
              <img src={settings.bg_url} alt="" className="rounded-xl aspect-[4/5] object-cover max-h-64" />
            ) : <div />}
            <div className="rounded-lg bg-white/90 p-4 space-y-3">
              <div className="text-lg font-bold text-primary">Hello! Welcome Back!</div>
              <div className="text-xs text-muted-foreground">Let's Login to Your Account</div>
              <div className="h-8 rounded border bg-white" />
              <div className="h-8 rounded border bg-white" />
              <div className="h-8 rounded bg-primary" />
            </div>
          </div>
          <div className="text-center text-[10px] text-primary/80 mt-4">{settings.footer}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadBtn({ label, accept, onFile, className }: { label: string; accept: string; onFile: (f: File) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
      <Button type="button" variant="outline" className={className} onClick={() => ref.current?.click()}>
        <Upload className="h-4 w-4 mr-2" /> {label}
      </Button>
    </>
  );
}
