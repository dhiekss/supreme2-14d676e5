import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/dashboard-kaprog")({
  head: () => ({ meta: [{ title: "Dashboard Ka. Prog — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Dashboard Ka. Prog" description="Ringkasan data per Kepala Program Keahlian." />,
});
