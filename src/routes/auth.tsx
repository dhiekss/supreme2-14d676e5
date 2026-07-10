import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Megaphone, Image as ImageIcon } from "lucide-react";
import { fetchDisplaySettings, DEFAULT_DISPLAY } from "@/lib/display-settings";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — SUPREME XPOES" },
      { name: "description", content: "Sistem Unggul Pengelolaan Madrasah SMK XPOES." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: d = DEFAULT_DISPLAY } = useQuery({
    queryKey: ["display-settings"],
    queryFn: fetchDisplaySettings,
    initialData: DEFAULT_DISPLAY,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: `linear-gradient(135deg, ${d.bg_color} 0%, #ffffff 60%, ${d.bg_color} 100%)` }}
    >
      {/* Header identitas */}
      <header className="flex items-start gap-3 px-6 md:px-12 py-6">
        {d.logo_url ? (
          <img src={d.logo_url} alt="logo" className="h-14 w-14 object-contain" />
        ) : (
          <div className="h-14 w-14 rounded bg-white/60 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-primary/60" />
          </div>
        )}
        <div className="leading-tight">
          <div className="font-bold text-primary text-lg">{d.app_name}</div>
          <div className="text-sm text-primary/80">{d.subtitle}</div>
          <div className="text-sm text-primary/80">{d.instansi}</div>
        </div>
      </header>

      {/* Konten utama */}
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-6xl grid gap-8 md:gap-12 md:grid-cols-2 items-center">
          {/* Gambar */}
          <div className="flex justify-center">
            {d.bg_url ? (
              <img
                src={d.bg_url}
                alt="Login illustration"
                className="rounded-2xl w-full max-w-md aspect-[4/5] object-cover shadow-lg"
              />
            ) : (
              <div
                className="rounded-2xl w-full max-w-md aspect-[4/5] shadow-lg"
                style={{ background: d.bg_color }}
              />
            )}
          </div>

          {/* Form */}
          <div className="w-full max-w-md mx-auto space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-primary leading-tight">
                Halo!<br />Selamat Datang<br />Kembali!
              </h1>
              <p className="text-primary/80 mt-2">Silahkan Masuk dengan Akunmu</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-primary">Email / NIP / NIS</Label>
                <Input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sekolah.sch.id"
                  className="rounded-full bg-white/80 h-11 px-5"
                />
                <p className="text-xs text-primary/70">Masukkan email, NIP (guru), atau NIS (murid)</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-primary">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-full bg-white/80 h-11 px-5 pr-11"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 rounded-full" disabled={loading}>
                {loading ? "Memproses..." : "Login"}
              </Button>

              <p className="text-sm text-primary/80">Tidak memiliki akun? Silahkan hubungi admin</p>

              <div className="rounded-2xl border-2 border-primary/30 p-3 flex items-center gap-3 bg-white/50">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-sm leading-tight">
                  <div className="font-semibold text-primary">Suara Publik</div>
                  <div className="text-primary/70 text-xs">Sampaikan aspirasimu di sini →</div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-primary/70 py-4 px-4">
        {d.footer}
      </footer>
    </div>
  );
}
