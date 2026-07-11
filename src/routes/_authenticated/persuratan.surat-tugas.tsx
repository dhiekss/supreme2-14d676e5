import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/surat-tugas")({
  head: () => ({ meta: [{ title: "Surat Tugas — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Surat Tugas" description="Pengelolaan surat tugas." />,
});
