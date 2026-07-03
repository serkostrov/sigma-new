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
