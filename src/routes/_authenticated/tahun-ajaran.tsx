import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./periode";

export const Route = createFileRoute("/_authenticated/tahun-ajaran")({
  head: () => ({ meta: [{ title: "Manajemen Tahun Ajaran — SUPREME XPOES" }] }),
  component: () => <Page defaultTab="tahun" />,
});
