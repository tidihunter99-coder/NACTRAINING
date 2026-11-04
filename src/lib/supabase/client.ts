import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Returns null until public Supabase credentials are configured.
 * Consumers must handle this explicitly instead of assuming authentication.
 */
export function createSupabaseBrowserClient() {
  const config = getSupabaseEnv();

  return config
    ? createBrowserClient(config.url, config.publishableKey)
    : null;
}
