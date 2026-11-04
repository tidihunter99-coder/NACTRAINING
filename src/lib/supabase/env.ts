export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey?.startsWith("sb_publishable_")) {
    return null;
  }

  // Remote Auth stays closed until the project's remote security and email
  // configuration are explicitly reviewed for public use.
  try {
    const endpoint = new URL(url);
    if (endpoint.pathname !== "/" || endpoint.origin !== url.replace(/\/$/, "")) return null;
    const host = endpoint.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    if (local && endpoint.protocol !== "http:") return null;
    if (!local) {
      if (endpoint.protocol !== "https:" || process.env.NEXT_PUBLIC_NAC_ENABLE_REMOTE_AUTH !== "true") return null;
      const site = process.env.NEXT_PUBLIC_SITE_URL;
      if (!site) return null;
      const siteUrl = new URL(site);
      if (siteUrl.protocol !== "https:" || siteUrl.origin !== site.replace(/\/$/, "")) return null;
    }
  } catch {
    return null;
  }

  return { url, publishableKey };
}
