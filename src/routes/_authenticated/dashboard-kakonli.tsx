import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard-kakonli")({
  head: () => ({ meta: [{ title: "Dashboard Ka. Konli — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Ka. Konli" description="Ringkasan data per Ketua Konsentrasi Keahlian." />,
});
