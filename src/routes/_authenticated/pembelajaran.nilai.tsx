import { createFileRoute } from "@tanstack/react-router";
import { PembelajaranPlaceholder } from "@/components/pembelajaran-placeholder";

export const Route = createFileRoute("/_authenticated/pembelajaran/nilai")({
  head: () => ({ meta: [{ title: "Pengelolaan Nilai — SUPREME XPOES" }] }),
  component: () => <PembelajaranPlaceholder title="Pengelolaan Nilai" />,
});
