import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createAktivitas } from "@/lib/aktivitas.functions";

// Map meta.log.action or mutationFn body to a human label + action tag.
function describeMutation(mutation: any): { action: string; description: string } | null {
  const meta = mutation?.options?.meta?.log as
    | { action?: string; description?: string; skip?: boolean }
    | undefined;
  if (meta?.skip) return null;

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  let action = meta?.action;
  if (!action) {
    // Heuristic: inspect the mutationFn source to guess intent
    let src = "";
    try {
      src = String(mutation?.options?.mutationFn ?? "").toLowerCase();
    } catch {
      src = "";
    }
    if (/aktivitas|activity_log/.test(src)) return null;
    if (/\b(del|delete|hapus|remove|destroy)/.test(src)) action = "hapus";
    else if (/\bimport/.test(src)) action = "import";
    else if (/\b(save|create|update|upsert|insert|edit|add|new)/.test(src)) action = "input/edit";
    else action = "mutasi";
  }
  const labelMap: Record<string, string> = {
    hapus: "Menghapus data",
    import: "Mengimpor data",
    "input/edit": "Menambah/mengubah data",
    mutasi: "Melakukan perubahan data",
  };
  const description =
    meta?.description ||
    `${labelMap[action] ?? "Melakukan perubahan data"}${path ? ` pada halaman ${path}` : ""}`;
  return { action, description };
}


export const getRouter = () => {
  const mutationCache = new MutationCache({
    onSuccess: (_data, variables, _ctx, mutation) => {
      const info = describeMutation(mutation);
      if (!info) return;
      // fire-and-forget; ignore errors so we don't disrupt UX
      createAktivitas({
        data: {
          action: info.action,
          description: info.description,
          metadata: { variables: safeSnapshot(variables) },
        },
      }).catch(() => {});
    },
  });

  const queryClient = new QueryClient({
    mutationCache,
    defaultOptions: {
      queries: {
        // Cache aggressively so switching menus feels instant.
        staleTime: 60_000, // 1 minute — reuse fetched data across navigation
        gcTime: 5 * 60_000, // keep in memory 5 minutes after unmount
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  function safeSnapshot(v: unknown): unknown {
    try {
      const s = JSON.stringify(v);
      if (!s) return null;
      return s.length > 2000 ? s.slice(0, 2000) + "…" : JSON.parse(s);
    } catch {
      return null;
    }
  }


  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload route chunks + data on hover/focus for instant navigation.
    defaultPreload: "intent",
    // Let TanStack Query own freshness; router preloads are effective for 30s.
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 200,
    defaultPendingMinMs: 0,
  });

  return router;
};
