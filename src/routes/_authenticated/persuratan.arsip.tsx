import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";

export const Route = createFileRoute("/_authenticated/persuratan/arsip")({
  head: () => ({ meta: [{ title: "Arsip Surat — SUPREME XPOES" }] }),
  component: () => <PlaceholderPage title="Arsip Surat" description="Arsip seluruh surat." />,
});
