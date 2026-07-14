import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pembelajaran/agenda-guru")({
  head: () => ({ meta: [{ title: "Agenda Guru — SUPREME XPOES" }] }),
  component: AgendaGuruPage,
  errorComponent: ({ error }) => <div className="text-destructive p-6">Gagal: {error.message}</div>,
});

function AgendaGuruPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda Guru</h1>
        <p className="text-muted-foreground mt-1">
          Modul Agenda Guru dalam tahap pengembangan.
        </p>
      </div>
    </div>
  );
}
