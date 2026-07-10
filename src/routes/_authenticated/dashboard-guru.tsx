import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard-guru")({
  head: () => ({ meta: [{ title: "Dashboard Guru — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Guru" description="Ringkasan data guru." />,
});
