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
    placeholderData: DEFAULT_DISPLAY,
    staleTime: 0,
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
      className="min-h-screen flex flex-col p-4 md:p-8"
      style={{
        background: `linear-gradient(120deg, #27391C 0%, #4B5A35 40%, #6B7B3A 100%)`,
      }}
    >
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl p-6 md:p-10">
          {/* Header identitas — di dalam card */}
          <header className="flex items-center gap-4 mb-8">
            {d.logo_url ? (
              <img src={d.logo_url} alt="logo" className="h-20 w-20 object-contain shrink-0" />
            ) : (
              <div className="h-20 w-20 rounded bg-muted flex items-center justify-center shrink-0">
                <ImageIcon className="h-8 w-8 text-primary/60" />
              </div>
            )}
            <div className="leading-tight min-w-0">
              <div className="font-bold text-primary text-xl md:text-2xl">{d.app_name}</div>
              <div className="text-base font-semibold text-foreground">{d.subtitle}</div>
              <div className="text-base font-semibold text-foreground">{d.instansi}</div>
            </div>
          </header>

          <div className="grid gap-8 md:gap-10 md:grid-cols-2 items-stretch">
            {/* Gambar */}
            <div className="flex">
              {d.bg_url ? (
                <img
                  src={d.bg_url}
                  alt="Login illustration"
                  className="rounded-2xl w-full h-full min-h-[420px] object-cover shadow-md"
                />
              ) : (
                <div
                  className="rounded-2xl w-full min-h-[420px] shadow-md"
                  style={{ background: d.bg_color }}
                />
              )}
            </div>


            {/* Form */}
            <div className="w-full space-y-5">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-primary leading-tight">
                  Halo!<br />Selamat Datang<br />Kembali!
                </h1>
                <p className="text-primary/80 mt-3">Silahkan Masuk dengan Akunmu</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-primary font-semibold">Email / NIP / NIS</Label>
                  <Input
                    id="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sekolah.sch.id"
                    className="rounded-full bg-secondary/60 h-11 px-5 border-0"
                  />
                  <p className="text-xs text-primary/70">Masukkan email, NIP (guru), atau NIS (murid)</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-primary font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="rounded-full bg-secondary/60 h-11 px-5 pr-11 border-0"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 rounded-full text-base" disabled={loading}>
                  {loading ? "Memproses..." : "Login"}
                </Button>

                <p className="text-sm text-primary/80">Tidak memiliki akun? Silahkan hubungi admin</p>

                <div className="rounded-2xl border-2 border-primary/30 p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
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
        </div>
      </main>

      <footer className="text-center text-xs text-white/90 pt-4">
        {d.footer}
      </footer>
    </div>
  );
}
