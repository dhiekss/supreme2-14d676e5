import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/surat-keluar")({
  head: () => ({ meta: [{ title: "Surat Keluar — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Surat Keluar" description="Pencatatan dan pengelolaan surat keluar." />,
});
