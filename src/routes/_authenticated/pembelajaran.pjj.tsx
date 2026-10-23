import { createFileRoute } from "@tanstack/react-router";
import { PjjPage, pjjOptionsQO, pjjListQO } from "@/components/pjj-page";

export const Route = createFileRoute("/_authenticated/pembelajaran/pjj")({
  head: () => ({ meta: [
    { title: "PJJ — SUPREME XPOES" },
    { name: "description", content: "Laporan kegiatan pembelajaran jarak jauh, murid aktif, dan bukti tugas di SUPREME." },
    { property: "og:title", content: "PJJ — SUPREME XPOES" },
    { property: "og:description", content: "Isian dan rekap laporan kegiatan pembelajaran jarak jauh SUPREME." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(pjjOptionsQO),
    context.queryClient.ensureQueryData(pjjListQO(false)),
  ]),
  component: PjjPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal membuka PJJ: {error instanceof Error ? error.message : "Silakan coba kembali"}</div>,
});