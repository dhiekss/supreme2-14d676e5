import { createFileRoute } from "@tanstack/react-router";
import { RombelPage } from "@/components/rombel-page";

export const Route = createFileRoute("/_authenticated/rombel")({
  head: () => ({ meta: [{ title: "Manajemen Rombel — SUPREME XPOES" }] }),
  component: () => <RombelPage />,
});
