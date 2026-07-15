import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Resolve a login identifier (email, NIP, or NIS) to the underlying auth email.
// This is a public server fn (no auth) — it MUST only return the email string,
// never other profile fields, to avoid enumerating user data.
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ identifier: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const raw = data.identifier.trim();
    if (!raw) return { email: null as string | null };
    // If it already looks like an email, return as-is.
    if (raw.includes("@")) return { email: raw };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Try NIP first, then NIS
    const { data: byNip } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("nip", raw)
      .maybeSingle();
    if ((byNip as any)?.email) return { email: (byNip as any).email as string };

    const { data: byNis } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("nis", raw)
      .maybeSingle();
    if ((byNis as any)?.email) return { email: (byNis as any).email as string };

    return { email: null };
  });
