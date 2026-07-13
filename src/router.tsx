import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
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
