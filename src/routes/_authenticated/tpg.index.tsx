import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tpg/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/tpg/laporan", replace: true });
  },
});
