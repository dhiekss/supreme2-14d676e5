import { createFileRoute, Outlet, useRouterState, Link, redirect } from "@tanstack/react-router";
import { Palette, Database, HardDrive, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/pengaturan/tampilan", label: "Tampilan", icon: Palette },
  { to: "/pengaturan/storage", label: "Storage", icon: HardDrive },
  { to: "/pengaturan/database", label: "Database", icon: Database },
  { to: "/pengaturan/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — SUPREME XPOES" }] }),
  beforeLoad: ({ location }) => {
    if (location.pathname === "/pengaturan" || location.pathname === "/pengaturan/") {
      throw redirect({ to: "/pengaturan/tampilan" });
    }
  },
  component: PengaturanLayout,
});

function PengaturanLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b overflow-x-auto">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
