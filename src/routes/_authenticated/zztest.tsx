import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/zztest")({
  loader: async () => ({ n: 42 }),
  component: () => {
    const d = Route.useLoaderData();
    return <div>ZZTEST {d.n}</div>;
  },
});
