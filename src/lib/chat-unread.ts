export function formatUnreadCount(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return String(count);
}

export function formatConversationPreview(text: string | null | undefined): string {
  const trimmed = text?.trim();
  if (!trimmed) return "Нет сообщений";
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}…`;
}
