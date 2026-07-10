import { createFileRoute } from "@tanstack/react-router";
import { PembelajaranPlaceholder } from "@/components/pembelajaran-placeholder";

export const Route = createFileRoute("/_authenticated/pembelajaran/kbm")({
  head: () => ({ meta: [{ title: "Pelaksanaan KBM — SUPREME XPOES" }] }),
  component: () => <PembelajaranPlaceholder title="Pelaksanaan KBM" />,
});
