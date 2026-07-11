import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Persuratan — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Pengaturan Persuratan" description="Konfigurasi modul persuratan." />,
});
