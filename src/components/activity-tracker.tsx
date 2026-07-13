import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createAktivitas } from "@/lib/aktivitas.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-record user activities into activity_logs:
 * - page navigation (dedup per pathname within session)
 * - sign-in / sign-out events
 */
export function ActivityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logFn = useServerFn(createAktivitas);
  const seen = useRef<Set<string>>(new Set());
  const lastPath = useRef<string>("");

  // Log navigation (debounced, deduped per path per session)
  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    const key = `nav:${pathname}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    const t = setTimeout(() => {
      logFn({
        data: {
          action: "navigate",
          description: `Membuka halaman ${pathname}`,
          metadata: { path: pathname },
        },
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [pathname, logFn]);

  // Log auth transitions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        logFn({
          data: { action: "signin", description: "Pengguna masuk ke aplikasi" },
        }).catch(() => {});
      } else if (event === "SIGNED_OUT") {
        // may fail due to lost session; ignore
        logFn({
          data: { action: "signout", description: "Pengguna keluar dari aplikasi" },
        }).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, [logFn]);

  return null;
}
