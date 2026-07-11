import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Persuratan — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Persuratan" description="Ringkasan aktivitas persuratan." />,
});
