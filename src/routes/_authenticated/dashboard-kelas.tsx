import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard-kelas")({
  head: () => ({ meta: [{ title: "Dashboard Kelas — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Kelas" description="Ringkasan data per kelas/rombel." />,
});
