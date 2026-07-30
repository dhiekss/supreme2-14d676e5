import { createFileRoute } from "@tanstack/react-router";
import { getBpBkData } from "@/lib/bpbk.functions";

export const Route = createFileRoute("/_authenticated/zztest")({
  loader: async () => ({ data: await getBpBkData() }),
  component: () => {
    const d = Route.useLoaderData();
    return <div>ZZTEST {JSON.stringify(d.data.counts)}</div>;
  },
});
