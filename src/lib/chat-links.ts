/** Ссылка на диалог в веб-мессенджере ВКонтакте. */
export function vkConversationSourceUrl(peerId: number | string): string {
  return `https://vk.com/im?sel=${encodeURIComponent(String(peerId))}`;
}
