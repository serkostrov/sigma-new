import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, MessageCircle, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { formatQueryError } from "@/lib/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { displayMessageText, isSystemLikeMessage } from "@/lib/avito/avito-client";
import { MessengerConversationItem } from "@/components/messenger-conversation-item";
import {
  useConnectVk,
  useMarkVkChatRead,
  useSendVkMessage,
  useSyncVkPeer,
  useVkAuthUrl,
  useVkChatStatus,
  useVkConversations,
  useVkMessages,
  type VkConversation,
} from "@/lib/vk-chat-api";

function formatMessageTime(unixSeconds: number): string {
  return format(new Date(unixSeconds * 1000), "dd MMM, HH:mm", { locale: ru });
}

function conversationInitials(title: string): string {
  return title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function VkConnectPanel() {
  const { data: status, isLoading, isError, error } = useVkChatStatus();
  const authUrl = useVkAuthUrl();
  const connect = useConnectVk();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Проверка подключения…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto mt-8 p-8 bg-muted/30 border border-border rounded-xl text-center space-y-4">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">Не удалось проверить ВКонтакте</h2>
        <p className="text-sm text-destructive">{formatQueryError(error)}</p>
      </div>
    );
  }

  if (status?.error) {
    return (
      <div className="max-w-lg mx-auto mt-8 p-8 bg-muted/30 border border-border rounded-xl text-center space-y-4">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="text-lg font-semibold">ВКонтакте недоступен</h2>
        <p className="text-sm text-destructive">{status.error}</p>
      </div>
    );
  }

  if (status?.connected) return null;

  const handleOAuth = async () => {
    try {
      const { url } = await authUrl.mutateAsync();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось открыть авторизацию VK");
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8 p-8 bg-muted/30 border border-border rounded-xl text-center space-y-4">
      <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
      <h2 className="text-lg font-semibold">Подключите ВКонтакте</h2>
      <p className="text-sm text-muted-foreground">
        Подключите аккаунт через OAuth или укажите{" "}
        <code className="text-xs">VK_ACCESS_TOKEN</code> в .env сервера.
      </p>
      {status?.oauthAvailable ? (
        <Button onClick={handleOAuth} disabled={authUrl.isPending}>
          {authUrl.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Войти через ВКонтакте
        </Button>
      ) : (
        <p className="text-xs text-amber-600">
          Для OAuth задайте VK_APP_ID, VK_APP_SECRET и VK_REDIRECT_URI в .env
        </p>
      )}
      {connect.isPending ? (
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Синхронизация сообщений…
        </p>
      ) : null}
    </div>
  );
}

export function VkChatPanel({ oauthCode }: { oauthCode?: string }) {
  const [selectedPeer, setSelectedPeer] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const oauthHandled = useRef(false);

  const { data: status } = useVkChatStatus();
  const { data: conversations, isLoading: convLoading } = useVkConversations();
  const {
    data: messages,
    isLoading: msgLoading,
    isError: msgError,
    error: msgErrorDetail,
  } = useVkMessages(selectedPeer);
  const syncPeer = useSyncVkPeer();
  const send = useSendVkMessage();
  const markRead = useMarkVkChatRead();
  const connect = useConnectVk();

  useEffect(() => {
    if (!oauthCode || oauthHandled.current) return;
    oauthHandled.current = true;
    connect.mutate(oauthCode, {
      onSuccess: () => {
        toast.success("ВКонтакте подключён");
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка подключения VK"),
    });
  }, [oauthCode, connect]);

  useEffect(() => {
    if (selectedPeer == null) return;
    syncPeer.mutate(selectedPeer);
    markRead.mutate(selectedPeer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeer]);

  const activeConversation = conversations?.find((c) => c.peer_id === selectedPeer);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || selectedPeer == null) return;
    send.mutate(
      { peerId: selectedPeer, text },
      {
        onSuccess: () => setDraft(""),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось отправить"),
      },
    );
  };

  if (!status?.connected && !connect.isSuccess) {
    return <VkConnectPanel />;
  }

  return (
    <MessengerLayout
      conversationsLoading={convLoading}
      conversationsEmpty={(conversations?.length ?? 0) === 0}
      selectedId={selectedPeer}
      onBack={() => setSelectedPeer(null)}
      conversationList={
        conversations?.map((c) => (
          <MessengerConversationItem
            key={c.peer_id}
            title={c.title}
            preview={c.last_message_text}
            photoUrl={c.photo_url}
            initials={conversationInitials(c.title) || "?"}
            unreadCount={c.unread_count}
            active={selectedPeer === c.peer_id}
            onClick={() => setSelectedPeer(Number(c.peer_id))}
          />
        )) ?? null
      }
      threadTitle={activeConversation?.title ?? (selectedPeer != null ? `Диалог ${selectedPeer}` : "")}
      threadNotice={null}
      messagesLoading={msgLoading}
      messagesError={
        msgError
          ? msgErrorDetail instanceof Error
            ? msgErrorDetail.message
            : "Не удалось загрузить сообщения"
          : null
      }
      messagesEmpty={(messages?.length ?? 0) === 0}
      messagesScrollDep={selectedPeer != null ? `${selectedPeer}-${messages?.length ?? 0}` : null}
      messages={
        messages?.map((m) => (
          <MessageBubble
            key={m.vk_message_id}
            text={m.text}
            isOutgoing={m.is_outgoing}
            time={formatMessageTime(m.vk_date)}
          />
        )) ?? null
      }
      draft={draft}
      onDraftChange={setDraft}
      onSend={handleSend}
      sendPending={send.isPending}
    />
  );
}

export function MessageBubble({
  text,
  isOutgoing,
  time,
  imageUrl,
  linkUrl,
  linkTitle,
  messageType,
}: {
  text: string;
  isOutgoing: boolean;
  time: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  messageType?: string | null;
}) {
  if (isSystemLikeMessage(text, messageType)) {
    const displayText = displayMessageText(text) || "Системное сообщение";
    return (
      <div className="flex justify-center px-2">
        <div className="max-w-[92%] rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Системное сообщение
          </p>
          <p className="text-sm text-foreground/85 whitespace-pre-wrap break-words">{displayText}</p>
          <p className="text-[10px] mt-1.5 text-muted-foreground">{time}</p>
        </div>
      </div>
    );
  }

  const hasImage = Boolean(imageUrl);
  const hasLink = Boolean(linkUrl);
  const hasText = Boolean(text.trim());

  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isOutgoing ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {hasImage ? (
          <a href={imageUrl!} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={imageUrl!}
              alt=""
              className="max-w-full max-h-64 rounded-lg object-cover"
              loading="lazy"
            />
          </a>
        ) : null}
        {hasText ? <p className="whitespace-pre-wrap break-words">{text}</p> : null}
        {hasLink ? (
          <a
            href={linkUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "block break-all underline underline-offset-2",
              hasText || hasImage ? "mt-1" : "",
              isOutgoing ? "text-primary-foreground/90" : "text-primary",
            )}
          >
            {linkTitle || linkUrl}
          </a>
        ) : null}
        {!hasText && !hasImage && !hasLink ? <p>—</p> : null}
        <p
          className={cn(
            "text-[10px] mt-1 opacity-70",
            isOutgoing ? "text-right" : "text-left",
          )}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

const SIDEBAR_WIDTH_STORAGE_KEY = "messenger-sidebar-width";
const SIDEBAR_DEFAULT_WIDTH = 320;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 560;

function readStoredSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
  if (!Number.isFinite(saved)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, saved));
}

export function MessengerLayout({
  conversationsLoading,
  conversationsEmpty,
  conversationList,
  selectedId,
  onBack,
  threadTitle,
  threadNotice,
  messagesLoading,
  messagesError,
  messagesEmpty,
  messages,
  messagesScrollDep,
  draft,
  onDraftChange,
  onSend,
  sendPending,
  composeDisabled,
  enableAttach,
  onAttachFiles,
  attachAccept,
}: {
  conversationsLoading: boolean;
  conversationsEmpty: boolean;
  conversationList: ReactNode;
  selectedId: string | number | null;
  onBack: () => void;
  threadTitle: string;
  threadNotice?: string | null;
  messagesLoading: boolean;
  messagesError: string | null;
  messagesEmpty: boolean;
  messages: ReactNode;
  /** Changes when the message list changes — triggers scroll to the latest message. */
  messagesScrollDep?: string | number | null;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sendPending: boolean;
  composeDisabled?: boolean;
  enableAttach?: boolean;
  onAttachFiles?: (files: File[]) => void;
  attachAccept?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const sidebarWidthRef = useRef(sidebarWidth);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  sidebarWidthRef.current = sidebarWidth;

  useEffect(() => {
    if (selectedId == null || messagesLoading) return;

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    };

    scrollToBottom();
    const frame = requestAnimationFrame(scrollToBottom);
    const timer = window.setTimeout(scrollToBottom, 50);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [selectedId, messagesLoading, messagesScrollDep]);

  const clampSidebarWidth = (width: number) => {
    const containerWidth = containerRef.current?.offsetWidth ?? 1200;
    const max = Math.min(SIDEBAR_MAX_WIDTH, Math.floor(containerWidth * 0.6));
    return Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, width));
  };

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!resizeRef.current) return;
      const delta = event.clientX - resizeRef.current.startX;
      setSidebarWidth(clampSidebarWidth(resizeRef.current.startWidth + delta));
    };

    const onPointerUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidthRef.current));
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="bg-card border border-border rounded-xl overflow-hidden h-[calc(100vh-14rem)] flex flex-col md:flex-row"
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <aside
        className={cn(
          "border-r border-border flex flex-col shrink-0 min-w-0 w-full md:w-[var(--sidebar-width)]",
          selectedId != null ? "hidden md:flex" : "flex",
        )}
      >
        <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
          Диалоги
        </div>
        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : conversationsEmpty ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Диалогов пока нет. Нажмите «Обновить».
            </p>
          ) : (
            <div className="p-2 space-y-1">{conversationList}</div>
          )}
        </ScrollArea>
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину списка диалогов"
        onPointerDown={handleResizeStart}
        className={cn(
          "hidden md:block w-1.5 shrink-0 cursor-col-resize touch-none",
          "bg-border/50 hover:bg-primary/25 active:bg-primary/40 transition-colors",
        )}
      />

      <section
        className={cn(
          "flex-1 flex flex-col min-w-0",
          selectedId == null ? "hidden md:flex" : "flex",
        )}
      >
          {selectedId == null ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Выберите диалог слева
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border font-medium truncate flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden shrink-0"
                  onClick={onBack}
                >
                  ←
                </Button>
                <span className="truncate">{threadTitle}</span>
              </div>
              {threadNotice ? (
                <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900">
                  {threadNotice}
                </p>
              ) : null}
              <ScrollArea className="flex-1 min-h-0 p-4">
                {messagesLoading ? (
                  <div className="text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : messagesError ? (
                  <p className="text-sm text-destructive text-center">{messagesError}</p>
                ) : messagesEmpty ? (
                  <p className="text-sm text-muted-foreground text-center">
                    Сообщений пока нет
                  </p>
                ) : (
                  <div className="space-y-3">
                    {messages}
                    <div ref={messagesEndRef} aria-hidden />
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t border-border flex gap-2">
                {enableAttach ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept={attachAccept}
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length > 0) onAttachFiles?.(files);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={sendPending || composeDisabled}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Прикрепить файл"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </>
                ) : null}
                <Input
                  placeholder={
                    composeDisabled
                      ? "Отправка недоступна без подписки API мессенджера"
                      : "Написать сообщение…"
                  }
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  disabled={sendPending || composeDisabled}
                />
                <Button
                  onClick={onSend}
                  disabled={sendPending || composeDisabled || !draft.trim()}
                >
                  {sendPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </section>
    </div>
  );
}
