import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { fetchDisplaySettings, DEFAULT_DISPLAY } from "@/lib/display-settings";
import { ActivityTracker } from "@/components/activity-tracker";
import { UndefinedErrorBoundary } from "@/components/undefined-error-boundary";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});


function AuthedLayout() {
  const { data: d = DEFAULT_DISPLAY } = useQuery({
    queryKey: ["display-settings"],
    queryFn: fetchDisplaySettings,
    initialData: DEFAULT_DISPLAY,
  });
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ActivityTracker />
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3">
            <SidebarTrigger />
            <div className="font-semibold text-foreground">SUPREME XPOES</div>
          </header>
          <main className="flex-1 p-6">
            <UndefinedErrorBoundary>
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Memuat…</div>}>
                <Outlet />
              </Suspense>
            </UndefinedErrorBoundary>
          </main>


          <footer className="border-t bg-card text-center text-xs text-muted-foreground py-3 px-4">
            {d.footer}
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
