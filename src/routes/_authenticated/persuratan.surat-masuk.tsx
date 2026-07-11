import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/surat-masuk")({
  head: () => ({ meta: [{ title: "Surat Masuk — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Surat Masuk" description="Pencatatan dan pengelolaan surat masuk." />,
});
