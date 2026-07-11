import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/disposisi")({
  head: () => ({ meta: [{ title: "Disposisi — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Disposisi" description="Alur disposisi surat." />,
});
