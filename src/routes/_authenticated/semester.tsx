import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./periode";

export const Route = createFileRoute("/_authenticated/semester")({
  head: () => ({ meta: [{ title: "Manajemen Semester — SUPREME XPOES" }] }),
  component: () => <Page defaultTab="semester" />,
});
