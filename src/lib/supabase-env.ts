/** Нормализует URL Supabase: без trailing slash, http→https для удалённых хостов. */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let url = raw.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(url);
    const isLocal =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".local");
    if (parsed.protocol === "http:" && !isLocal) {
      parsed.protocol = "https:";
      url = parsed.origin;
    }
  } catch {
    // оставляем как есть
  }

  return url;
}

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

declare global {
  interface Window {
    __SUPABASE_CONFIG__?: SupabasePublicConfig;
  }
}

/** Публичный конфиг Supabase: runtime (SSR) → VITE_* (build) → process.env (SSR). */
export function resolveSupabasePublicConfig(): Partial<SupabasePublicConfig> {
  const runtime =
    typeof window !== "undefined" ? window.__SUPABASE_CONFIG__ : undefined;

  const url = normalizeSupabaseUrl(
    runtime?.url ||
      import.meta.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL,
  );

  const publishableKey =
    runtime?.publishableKey ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return { url, publishableKey };
}

export function getRuntimeSupabaseConfigForShell(): SupabasePublicConfig | null {
  const { url, publishableKey } = resolveSupabasePublicConfig();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
