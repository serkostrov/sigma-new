const AVITO_API_BASE = "https://api.avito.ru";

export const AVITO_CHAT_BUCKET = "avito-chat";

export const AVITO_IMAGE_MAX_BYTES = 24 * 1024 * 1024;

export const AVITO_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
  "image/webp",
]);

export const AVITO_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export const AVITO_ATTACHMENT_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z";

export type AvitoUploadImagesResponse = Record<
  string,
  Record<string, string>
>;

export function isAvitoNativeImage(mimeType: string): boolean {
  return AVITO_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function avitoAttachmentKind(
  mimeType: string,
): "image" | "video" | "audio" | "document" {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export function avitoUnsupportedFileMessage(kind: ReturnType<typeof avitoAttachmentKind>): string {
  if (kind === "image") {
    return "Неподдерживаемый формат изображения. Авито принимает JPEG, PNG, GIF, BMP, HEIC до 24 МБ.";
  }
  return "Авито не поддерживает отправку этого типа файла напрямую. Файл будет отправлен ссылкой в сообщении.";
}

function parseAvitoUploadError(res: Response, body: string): string {
  try {
    const json = JSON.parse(body) as { error?: { message?: string }; message?: string };
    if (json.error?.message) return json.error.message;
    if (json.message) return json.message;
  } catch {
    // ignore
  }
  return `HTTP ${res.status}: ${body.slice(0, 200)}`;
}

export async function avitoUploadImage(
  userId: number,
  accessToken: string,
  file: Blob,
  filename: string,
): Promise<string> {
  const form = new FormData();
  form.append("uploadfile[]", file, filename);

  const res = await fetch(`${AVITO_API_BASE}/messenger/v1/accounts/${userId}/uploadImages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(parseAvitoUploadError(res, body));
  }

  const json = JSON.parse(body || "{}") as AvitoUploadImagesResponse;
  const imageId = Object.keys(json)[0];
  if (!imageId) {
    throw new Error("Авито не вернул идентификатор изображения");
  }
  return imageId;
}

export function sanitizeAttachmentFileName(name: string): string {
  const base = name.trim().replace(/[/\\?%*:|"<>]/g, "_");
  return base.slice(0, 120) || "file";
}
