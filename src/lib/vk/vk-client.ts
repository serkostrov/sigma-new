const VK_API_VERSION = "5.199";

export type VkApiError = { error_code: number; error_msg: string };

type VkResponse<T> = { response: T } | { error: VkApiError };

export async function vkApiCall<T>(
  method: string,
  params: Record<string, string | number | boolean>,
  accessToken: string,
): Promise<T> {
  const search = new URLSearchParams({
    access_token: accessToken,
    v: VK_API_VERSION,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  });

  const res = await fetch(`https://api.vk.com/method/${method}?${search}`);
  const json = (await res.json()) as VkResponse<T>;

  if ("error" in json) {
    throw new Error(`VK API ${method}: [${json.error.error_code}] ${json.error.error_msg}`);
  }

  return json.response;
}

export type VkProfile = {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
};

export type VkConversationItem = {
  conversation: {
    peer: { id: number; type: string };
    chat_settings?: { title?: string; photo?: { photo_100?: string } };
  };
  last_message?: {
    id: number;
    date: number;
    from_id: number;
    text: string;
    out?: 0 | 1;
  };
  unread_count?: number;
};

export type VkConversationsResponse = {
  count: number;
  items: VkConversationItem[];
  profiles?: VkProfile[];
  groups?: { id: number; name: string; photo_100?: string }[];
};

export type VkMessage = {
  id: number;
  date: number;
  from_id: number;
  text: string;
  out?: 0 | 1;
  peer_id?: number;
};

export type VkHistoryResponse = {
  count: number;
  items: VkMessage[];
  profiles?: VkProfile[];
};

export function peerTitle(
  peerId: number,
  profiles: VkProfile[] = [],
  groups: { id: number; name: string }[] = [],
  chatTitle?: string,
): string {
  if (chatTitle) return chatTitle;
  if (peerId > 0) {
    const p = profiles.find((x) => x.id === peerId);
    if (p) return `${p.first_name} ${p.last_name}`.trim();
    return `Пользователь ${peerId}`;
  }
  const groupId = Math.abs(peerId);
  const g = groups.find((x) => x.id === groupId);
  if (g) return g.name;
  return `Чат ${peerId}`;
}

export function peerPhoto(
  peerId: number,
  profiles: VkProfile[] = [],
  groups: { id: number; photo_100?: string }[] = [],
  chatPhoto?: string,
): string | null {
  if (chatPhoto) return chatPhoto;
  if (peerId > 0) {
    return profiles.find((x) => x.id === peerId)?.photo_100 ?? null;
  }
  const groupId = Math.abs(peerId);
  return groups.find((x) => x.id === groupId)?.photo_100 ?? null;
}
