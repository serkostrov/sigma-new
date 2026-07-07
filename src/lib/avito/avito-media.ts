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
]);

const EXTENSION_MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export function guessMimeFromFileName(fileName: string): string | undefined {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  return EXTENSION_MIME_TYPES[ext];
}

export function resolveAttachmentMimeType(fileName: string, mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized && normalized !== "application/octet-stream") return normalized;
  return guessMimeFromFileName(fileName) ?? "application/octet-stream";
}

export const AVITO_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export const AVITO_ATTACHMENT_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z";

export type AvitoUploadImagesResponse = Record<
  string,
  Record<string, string>
>;

export type AvitoUploadedImage = {
  imageId: string;
  sizes: Record<string, string>;
};

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
    return "Формат не поддерживается Авито напрямую (например WebP). Файл будет отправлен ссылкой в сообщении.";
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
): Promise<AvitoUploadedImage> {
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
  return { imageId, sizes: json[imageId] ?? {} };
}

export function sanitizeAttachmentFileName(name: string): string {
  const base = name.trim().replace(/[/\\?%*:|"<>]/g, "_");
  return base.slice(0, 120) || "file";
}
