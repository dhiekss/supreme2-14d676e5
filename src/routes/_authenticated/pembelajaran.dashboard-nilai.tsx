import { createFileRoute } from "@tanstack/react-router";
import { PembelajaranPlaceholder } from "@/components/pembelajaran-placeholder";

export const Route = createFileRoute("/_authenticated/pembelajaran/dashboard-nilai")({
  head: () => ({ meta: [{ title: "Dashboard Nilai — SUPREME XPOES" }] }),
  component: () => <PembelajaranPlaceholder title="Dashboard Nilai" />,
});
