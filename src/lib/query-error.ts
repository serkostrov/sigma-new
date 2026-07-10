/** Ошибка из Postgres / Supabase (не внешний API). */
export function isDatabaseErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("column ") ||
    lower.includes("does not exist") ||
    lower.includes("relation ") ||
    lower.includes("permission denied") ||
    lower.includes("user_has_permission") ||
    lower.includes("role_permissions")
  );
}

export function formatQueryError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.length > 0) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.length > 0) {
      return record.error;
    }
    if (typeof record.statusText === "string" && record.statusText.length > 0) {
      return record.statusText;
    }
  }
  return "Ошибка сервера";
}
