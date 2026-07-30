import { createFileRoute } from "@tanstack/react-router";
import { listAllStudents } from "@/lib/sp.functions";

export const Route = createFileRoute("/_authenticated/zztest")({
  loader: async () => ({ n: (await listAllStudents()).length }),
  component: () => {
    const d = Route.useLoaderData();
    return <div>ZZTEST {d.n}</div>;
  },
});
