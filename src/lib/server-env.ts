let loaded = false;

/** Загружает `.env` в process.env (Node 22+). В Docker/Dokploy переменные уже в окружении. */
export function loadServerEnv(): void {
  if (loaded || typeof process.loadEnvFile !== "function") return;
  loaded = true;

  try {
    process.loadEnvFile(".env");
  } catch {
    // .env отсутствует или недоступен — используем process.env как есть
  }
}

export function serverEnv(name: string): string | undefined {
  loadServerEnv();
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
