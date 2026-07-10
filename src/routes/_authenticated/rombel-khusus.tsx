import { createFileRoute } from "@tanstack/react-router";
import { RombelPage } from "@/components/rombel-page";

export const Route = createFileRoute("/_authenticated/rombel-khusus")({
  head: () => ({ meta: [{ title: "Rombel Khusus — SUPREME XPOES" }] }),
  component: () => <RombelPage khusus />,
});
