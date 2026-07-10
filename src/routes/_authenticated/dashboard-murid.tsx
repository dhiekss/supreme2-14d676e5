import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard-murid")({
  head: () => ({ meta: [{ title: "Dashboard Murid — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Murid" description="Ringkasan data murid." />,
});
