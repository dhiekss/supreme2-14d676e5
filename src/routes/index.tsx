import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SUPREME — Sistem Pengelolaan Sekolah" },
    { name: "description", content: "Portal pengelolaan kegiatan sekolah, presensi, dan pembelajaran SUPREME." },
    { property: "og:title", content: "SUPREME — Sistem Pengelolaan Sekolah" },
    { property: "og:description", content: "Portal kegiatan dan administrasi sekolah SUPREME." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  ssr: false,
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
  }, [navigate]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Memuat…</div>
    </div>
  );
}
