import { createFileRoute } from "@tanstack/react-router";
import { PembelajaranPlaceholder } from "@/components/pembelajaran-placeholder";

export const Route = createFileRoute("/_authenticated/pembelajaran/rekap-kbm")({
  head: () => ({ meta: [{ title: "Rekap Pelaksanaan KBM — SUPREME XPOES" }] }),
  component: () => <PembelajaranPlaceholder title="Rekap Pelaksanaan KBM" />,
});
